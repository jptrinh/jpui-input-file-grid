<template>
    <div
        class="ww-file-upload"
        :class="{
            'ww-file-upload--disabled': isDisabled,
            'ww-file-upload--readonly': isReadonly,
        }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        role="region"
        aria-label="File upload area"
    >
        <!-- Main upload area -->
        <div class="ww-file-upload__dropzone" @click="openFileExplorer">
            <wwLayout path="dropzoneContent" direction="column" class="ww-file-upload__content" />
        </div>

        <!-- Hidden file input -->
        <input
            ref="fileInput"
            type="file"
            class="ww-file-upload__input"
            :multiple="type === 'multi'"
            :accept="acceptedFileTypes"
            :required="required && !hasFiles"
            :disabled="isDisabled || isReadonly"
            aria-label="File upload"
            @change="handleFileSelection"
        />
    </div>
</template>

<script>
import { ref, computed, watch, inject } from 'vue';
import { validateFile } from './utils/fileValidation';
import { fileToBase64, fileToBinary } from './utils/fileProcessing';

/* wwEditor:start */
import useParentSelection from './editor/useParentSelection';
/* wwEditor:end */

export default {
    props: {
        content: { type: Object, required: true },
        /* wwEditor:start */
        wwFrontState: { type: Object, required: true },
        wwEditorState: { type: Object, required: true },
        parentSelection: { type: Object, default: () => ({ allow: false, texts: {} }) },
        /* wwEditor:end */
        uid: { type: String, required: true },
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'add-state', 'remove-state'],
    setup(props, { emit }) {
        const isEditing = computed(() => {
            /* wwEditor:start */
            return props.wwEditorState?.isEditing;
            /* wwEditor:end */
            // eslint-disable-next-line no-unreachable
            return false;
        });

        /* wwEditor:start */
        const { selectParentElement } = useParentSelection(props, emit);
        /* wwEditor:end */

        const fileInput = ref(null);
        const isDragging = ref(false);

        const type = computed(() => props.content?.type || 'single');
        const reorder = computed(() => props.content?.reorder || false);
        const drop = computed(() => props.content?.drop !== false);
        const maxFileSize = computed(() => props.content?.maxFileSize || 10);
        const minFileSize = computed(() => props.content?.minFileSize || 0);
        const maxTotalFileSize = computed(() => props.content?.maxTotalFileSize || 50);
        const maxFiles = computed(() => props.content?.maxFiles || 10);
        const required = computed(() => props.content?.required || false);
        const extensions = computed(() => props.content?.extensions || 'any');
        const customExtensions = computed(() => props.content?.customExtensions || '');
        const exposeBase64 = computed(() => props.content?.exposeBase64 || false);
        const exposeBinary = computed(() => props.content?.exposeBinary || false);

        // Error message templates
        const errorMessages = computed(() => ({
            multipleFiles: props.content?.errorMsgMultipleFiles || 'Multiple files provided in single file mode',
            maxFilesReached: props.content?.errorMsgMaxFilesReached || 'Maximum number of files ({max}) reached',
            tooManyFiles: props.content?.errorMsgTooManyFiles || 'Only {available} more file(s) can be added',
            fileTooSmall: props.content?.errorMsgFileTooSmall || 'File size ({size} MB) is below minimum ({min} MB)',
            fileTooLarge: props.content?.errorMsgFileTooLarge || 'File size ({size} MB) exceeds maximum ({max} MB)',
            totalSizeExceeded:
                props.content?.errorMsgTotalSizeExceeded || 'Total size ({total} MB) exceeds maximum ({max} MB)',
            invalidType: props.content?.errorMsgInvalidType || 'File type "{type}" is not allowed. Accepted: {allowed}',
        }));

        // Helper to format error messages with placeholders
        const formatMessage = (template, values) => {
            return template.replace(/\{(\w+)\}/g, (match, key) => {
                return values[key] !== undefined ? values[key] : match;
            });
        };

        const isDisabled = computed(() => props.wwElementState.props.disabled || false);
        const isReadonly = computed(() => {
            /* wwEditor:start */
            if (props.wwEditorState?.isSelected) {
                return props.wwElementState.states.includes('readonly');
            }
            /* wwEditor:end */
            return props.wwElementState.props.readonly === undefined
                ? props.content?.readonly || false
                : props.wwElementState.props.readonly;
        });

        // Internal variable for the structured data
        const { value: componentData, setValue: setComponentData } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'value',
            defaultValue: {
                existingFiles: [],
                newFiles: [],
                deletedFiles: [],
                allFiles: [],
            },
            type: 'object',
            componentType: 'element',
        });

        // Helper to safely get component data parts
        const existingFiles = computed(() => componentData.value?.existingFiles || []);
        const newFiles = computed(() => componentData.value?.newFiles || []);
        const deletedFiles = computed(() => componentData.value?.deletedFiles || []);
        // Track the last initialValue to avoid unnecessary resets
        const lastInitialValue = ref(null);

        // Watch for initialValue changes and reset existingFiles only when it actually changes
        watch(
            () => props.content?.initialValue,
            newInitialValue => {
                const initialArray = Array.isArray(newInitialValue) ? newInitialValue : [];
                const serialized = JSON.stringify(initialArray);

                // Only reset if initialValue actually changed
                if (serialized !== lastInitialValue.value) {
                    lastInitialValue.value = serialized;
                    setComponentData({
                        existingFiles: initialArray,
                        newFiles: [],
                        deletedFiles: [],
                        allFiles: initialArray,
                    });
                }
            },
            { immediate: true }
        );

        const { value: status, setValue: setStatus } = wwLib.wwVariable.useComponentVariable({
            uid: props.uid,
            name: 'status',
            defaultValue: {},
            type: 'any',
        });

        const lastError = ref(null);

        const useForm = inject('_wwForm:useForm', () => {});
        const fieldName = computed(() => props.content.fieldName);
        const validation = computed(() => props.content.validation);
        const customValidation = computed(() => props.content.customValidation);

        useForm(
            componentData,
            { fieldName, validation, customValidation, required },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue: setComponentData }
        );

        // Combined list of all files (existing + new) for display purposes
        const fileList = computed(() => [...existingFiles.value, ...newFiles.value]);
        const hasFiles = computed(() => fileList.value.length > 0);

        watch([status, fileList], ([newStatus, allFiles]) => {
            if (newStatus && typeof newStatus === 'object') {
                const fileNames = allFiles.map(file => file.name).filter(Boolean);
                const updatedStatus = Object.fromEntries(
                    Object.entries(newStatus).filter(([key]) => fileNames.includes(key))
                );

                if (Object.keys(updatedStatus).length !== Object.keys(newStatus).length) {
                    setStatus(updatedStatus);
                }
            }
        });

        const acceptedFileTypes = computed(() => {
            switch (extensions.value) {
                case 'image':
                    return 'image/*';
                case 'video':
                    return 'video/*';
                case 'audio':
                    return 'audio/*';
                case 'pdf':
                    return '.pdf';
                case 'csv':
                    return '.csv';
                case 'excel':
                    return '.xls,.xlsx,.xlsm,.xlsb';
                case 'word':
                    return '.doc,.docx,.docm';
                case 'json':
                    return '.json';
                case 'custom':
                    return customExtensions.value;
                default:
                    return '';
            }
        });

        // Helper to serialize file objects for local context
        const serializeFile = file => {
            if (!file) return null;
            const plainObject = {};
            for (const key in file) {
                if (Object.prototype.hasOwnProperty.call(file, key)) {
                    plainObject[key] = file[key];
                }
            }
            if (file.name) plainObject.name = file.name;
            if (file.size) plainObject.size = file.size;
            if (file.type) plainObject.type = file.type;
            if (file.lastModified) plainObject.lastModified = file.lastModified;
            if (file.mimeType) plainObject.mimeType = file.mimeType;
            if (file.id) plainObject.id = file.id;
            if (file.base64) plainObject.base64 = file.base64;
            if (file.binary) plainObject.binary = file.binary;
            return plainObject;
        };

        const localData = ref({
            fileUpload: {
                existingFiles: computed(() => existingFiles.value),
                newFiles: computed(() => newFiles.value.map(serializeFile)),
                deletedFiles: computed(() => deletedFiles.value),
                allFiles: computed(() => [...existingFiles.value, ...newFiles.value.map(serializeFile)]),
                status: status,
                error: lastError,
            },
        });

        // Drag and drop handlers
        const handleDragOver = event => {
            if (isDisabled.value || isReadonly.value || !drop.value || isEditing.value) return;
            event.stopPropagation();
            isDragging.value = true;
        };

        const handleDragLeave = event => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            isDragging.value = false;
        };

        // Methods
        const openFileExplorer = () => {
            if (!isDisabled.value && !isReadonly.value && !isEditing.value) {
                fileInput.value.click();
            }
        };

        const handleDrop = async event => {
            isDragging.value = false;
            if (isDisabled.value || isReadonly.value || !drop.value) return;

            const items = event.dataTransfer.files;
            if (!items.length) return;

            await processFiles(items);
        };

        const handleFileSelection = async event => {
            const selectedFiles = event.target.files;
            if (!selectedFiles.length) return;

            await processFiles(selectedFiles);
            event.target.value = '';
        };

        const processFiles = async fileList => {
            lastError.value = null; // Reset error state when user tries to add file
            const filesToProcess = Array.from(fileList);

            // Single mode handling
            if (type.value === 'single') {
                if (filesToProcess.length > 1) {
                    const errorData = {
                        code: 'SINGLE_MODE_MULTIPLE_FILES',
                        message: errorMessages.value.multipleFiles,
                        data: {
                            count: filesToProcess.length,
                            acceptedCount: 1,
                        },
                    };
                    lastError.value = errorData;
                    emit('trigger-event', {
                        name: 'error',
                        event: errorData,
                    });
                }

                filesToProcess.splice(1);
                // Clear existing files when in single mode
                const updatedDeletedImages = [...deletedFiles.value, ...existingFiles.value];
                setComponentData({
                    existingFiles: [],
                    newFiles: [],
                    deletedFiles: updatedDeletedImages,
                    allFiles: [],
                });
            }

            let availableSlots = Infinity;
            const currentFileCount = existingFiles.value.length + newFiles.value.length;
            if (type.value === 'multi' && maxFiles.value > 0) {
                availableSlots = maxFiles.value - currentFileCount;
                if (availableSlots <= 0) {
                    const message = formatMessage(errorMessages.value.maxFilesReached, {
                        max: maxFiles.value,
                    });
                    const errorData = {
                        code: 'MAX_FILES_REACHED',
                        message,
                        data: {
                            maxFiles: maxFiles.value,
                            currentCount: currentFileCount,
                        },
                    };
                    lastError.value = errorData;
                    emit('trigger-event', {
                        name: 'error',
                        event: errorData,
                    });

                    wwLib.wwNotification.open({
                        text: { en: message },
                        color: 'warning',
                    });

                    return;
                } else if (filesToProcess.length > availableSlots) {
                    const message = formatMessage(errorMessages.value.tooManyFiles, {
                        available: availableSlots,
                    });
                    const errorData = {
                        code: 'TOO_MANY_FILES',
                        message,
                        data: {
                            providedCount: filesToProcess.length,
                            availableSlots: availableSlots,
                            maxFiles: maxFiles.value,
                            currentCount: currentFileCount,
                        },
                    };
                    lastError.value = errorData;
                    emit('trigger-event', {
                        name: 'error',
                        event: errorData,
                    });
                }
            }

            // Process valid files
            const limitedFiles = filesToProcess.slice(0, availableSlots);
            const processedFiles = [];

            // Only calculate currentTotalSize for multi-file mode (only new files have size)
            const currentTotalSize =
                type.value === 'multi' ? newFiles.value.reduce((sum, f) => sum + (f.size || 0), 0) : 0;

            for (const file of limitedFiles) {
                const validationResult = validateFile(file, {
                    maxFileSize: maxFileSize.value,
                    minFileSize: minFileSize.value,
                    // Only apply maxTotalFileSize in multi-file mode
                    maxTotalFileSize: type.value === 'multi' ? maxTotalFileSize.value : undefined,
                    currentTotalSize: type.value === 'multi' ? currentTotalSize : 0,
                    acceptedTypes: acceptedFileTypes.value,
                });

                if (validationResult.valid) {
                    file.id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    file.mimeType = file.type;
                    if (exposeBase64.value) file.base64 = await fileToBase64(file);
                    if (exposeBinary.value) file.binary = await fileToBinary(file);
                    processedFiles.push(file);
                } else {
                    console.warn(`File validation failed: ${validationResult.reason}`);
                    const fileSizeInMB = (file.size / (1024 * 1024)).toFixed(2);

                    // Get custom message based on constraint type
                    let message = validationResult.reason;
                    switch (validationResult.constraint) {
                        case 'MIN_SIZE':
                            message = formatMessage(errorMessages.value.fileTooSmall, {
                                size: fileSizeInMB,
                                min: minFileSize.value,
                            });
                            break;
                        case 'MAX_SIZE':
                            message = formatMessage(errorMessages.value.fileTooLarge, {
                                size: fileSizeInMB,
                                max: maxFileSize.value,
                            });
                            break;
                        case 'MAX_TOTAL_SIZE':
                            message = formatMessage(errorMessages.value.totalSizeExceeded, {
                                total: validationResult.details?.resultingTotalSize?.toFixed(2) || fileSizeInMB,
                                max: maxTotalFileSize.value,
                            });
                            break;
                        case 'INVALID_TYPE':
                            message = formatMessage(errorMessages.value.invalidType, {
                                type: file.type || 'unknown',
                                allowed: acceptedFileTypes.value,
                            });
                            break;
                    }

                    const errorData = {
                        code: 'VALIDATION_ERROR',
                        message,
                        data: {
                            fileName: file.name,
                            fileSize: file.size,
                            fileType: file.type,
                            constraint: validationResult.constraint,
                        },
                    };
                    lastError.value = errorData;
                    emit('trigger-event', {
                        name: 'error',
                        event: errorData,
                    });

                    /* wwEditor:start */
                    wwLib.wwNotification.open({
                        text: { en: message },
                        color: 'error',
                    });
                    /* wwEditor:end */
                }
            }

            if (processedFiles.length > 0) {
                if (type.value === 'single') {
                    const newData = {
                        existingFiles: [],
                        newFiles: processedFiles,
                        deletedFiles: [...deletedFiles.value, ...existingFiles.value],
                        allFiles: processedFiles,
                    };
                    setComponentData(newData);
                    emit('trigger-event', {
                        name: 'change',
                        event: { value: newData },
                    });
                } else {
                    const currentNewFiles = [...newFiles.value];
                    let updatedNewFiles = [...currentNewFiles];

                    const addNextFile = index => {
                        updatedNewFiles = [...updatedNewFiles, processedFiles[index]];
                        const newData = {
                            existingFiles: existingFiles.value,
                            newFiles: updatedNewFiles,
                            deletedFiles: deletedFiles.value,
                            allFiles: [...existingFiles.value, ...updatedNewFiles],
                        };
                        setComponentData(newData);

                        if (index < processedFiles.length - 1) {
                            setTimeout(() => addNextFile(index + 1), 150);
                        } else {
                            emit('trigger-event', {
                                name: 'change',
                                event: { value: newData },
                            });
                        }
                    };

                    // Start adding files with a small initial delay
                    setTimeout(() => addNextFile(0), 50);
                }
            }
        };

        const removeFile = index => {
            if (isDisabled.value || isReadonly.value) return;

            const existingCount = existingFiles.value.length;
            let newData;

            if (index < existingCount) {
                // Removing an existing image - add to deletedFiles
                const removedImage = existingFiles.value[index];
                const updatedExisting = existingFiles.value.filter((_, i) => i !== index);
                newData = {
                    existingFiles: updatedExisting,
                    newFiles: newFiles.value,
                    deletedFiles: [...deletedFiles.value, removedImage],
                    allFiles: [...updatedExisting, ...newFiles.value],
                };
            } else {
                // Removing a new file
                const newFileIndex = index - existingCount;
                const updatedNewFiles = newFiles.value.filter((_, i) => i !== newFileIndex);
                newData = {
                    existingFiles: existingFiles.value,
                    newFiles: updatedNewFiles,
                    deletedFiles: deletedFiles.value,
                    allFiles: [...existingFiles.value, ...updatedNewFiles],
                };
            }

            setComponentData(newData);

            emit('trigger-event', {
                name: 'change',
                event: { value: newData },
            });
        };

        const reorderFiles = (fromIndex, toIndex) => {
            if (isDisabled.value || isReadonly.value || !reorder.value) return;

            // Combine all files for reordering
            const combinedFiles = [...existingFiles.value, ...newFiles.value];
            const [movedItem] = combinedFiles.splice(fromIndex, 1);
            combinedFiles.splice(toIndex, 0, movedItem);

            // Split back into existing and new (based on whether they have File properties)
            const reorderedExisting = [];
            const reorderedNew = [];
            for (const file of combinedFiles) {
                if (file instanceof File || file.lastModified) {
                    reorderedNew.push(file);
                } else {
                    reorderedExisting.push(file);
                }
            }

            const newData = {
                existingFiles: reorderedExisting,
                newFiles: reorderedNew,
                deletedFiles: deletedFiles.value,
                allFiles: combinedFiles,
            };
            setComponentData(newData);

            emit('trigger-event', {
                name: 'change',
                event: { value: newData },
            });
        };

        const clearFiles = () => {
            const newData = {
                existingFiles: [],
                newFiles: [],
                deletedFiles: [...deletedFiles.value, ...existingFiles.value],
                allFiles: [],
            };
            setComponentData(newData);
        };

        const clearError = () => {
            lastError.value = null;
        };

        wwLib.wwElement.useRegisterElementLocalContext('fileUpload', localData.value.fileUpload, {
            clearFiles: {
                description: 'Clear all files',
                method: clearFiles,
                editor: { label: 'Clear Files', group: 'File Upload', icon: 'trash' },
            },
            clearError: {
                description: 'Clear the last error',
                method: clearError,
                editor: { label: 'Clear Error', group: 'File Upload', icon: 'x' },
            },
            removeFile: {
                description: 'Remove a file by index',
                method: removeFile,
                editor: { label: 'Remove File', group: 'File Upload', icon: 'minus' },
            },
            reorderFiles: {
                description: 'Reorder files by moving from one index to another',
                method: reorderFiles,
                editor: { label: 'Reorder Files', group: 'File Upload', icon: 'arrows-up-down' },
            },
        });

        watch(
            isReadonly,
            value => {
                if (value) {
                    emit('add-state', 'readonly');
                } else {
                    emit('remove-state', 'readonly');
                }
            },
            { immediate: true }
        );

        watch(
            isDisabled,
            value => {
                if (value) {
                    emit('add-state', 'disabled');
                } else {
                    emit('remove-state', 'disabled');
                }
            },
            { immediate: true }
        );

        watch(
            isDragging,
            value => {
                if (value && !isDisabled.value && !isReadonly.value) {
                    emit('add-state', 'dragging');
                } else {
                    emit('remove-state', 'dragging');
                }
            },
            { immediate: true }
        );

        return {
            fileInput,
            hasFiles,
            isDisabled,
            isReadonly,
            acceptedFileTypes,
            openFileExplorer,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handleFileSelection,
            type,
            required,
            isEditing,

            // Actions exposed for ww-config.js
            clearFiles,
            clearError,
            removeFile,
            reorderFiles,

            /* wwEditor:start */
            selectParentElement,
            /* wwEditor:end */
        };
    },
};
</script>

<style lang="scss" scoped>
.ww-file-upload {
    display: flex;
    flex-direction: column;
    width: 100%;
    position: relative;

    &__input {
        opacity: 0;
        background: rgba(0, 0, 0, 0);
        border: 0;
        bottom: -1px;
        font-size: 0;
        height: 1px;
        left: 0;
        outline: none;
        padding: 0;
        position: absolute;
        right: 0;
        width: 100%;
    }

    &__dropzone {
        position: relative;
        overflow: hidden;
        cursor: v-bind('isEditing ? "unset" : "pointer"');
        isolation: isolate;
        height: 100%;
        width: 100%;
    }

    &__content {
        position: relative;
        z-index: 2;
        height: 100%;
        width: 100%;
    }

    &--disabled {
        opacity: 0.6;
        pointer-events: none;

        .ww-file-upload__dropzone {
            cursor: not-allowed;
        }
    }

    &--readonly {
        .ww-file-upload__dropzone {
            cursor: default;
        }
    }
}
</style>
