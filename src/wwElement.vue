<template>
    <div
        class="ww-file-upload"
        :class="{
            'ww-file-upload--disabled': isDisabled,
            'ww-file-upload--readonly': isReadonly,
            'ww-file-upload--dragging': isDragging,
        }"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="handleDragLeave"
        @drop.prevent="handleDrop"
        role="region"
        aria-label="File upload area"
    >
        <input
            ref="fileInput"
            type="file"
            class="ww-file-upload__input"
            :multiple="maxFiles !== 1"
            :accept="acceptedFileTypes"
            :required="required && !hasFiles"
            :disabled="isDisabled || isReadonly"
            aria-label="File upload"
            @change="handleFileSelection"
        />

        <div class="ww-file-upload__row">
            <div v-for="(file, index) in fileList" :key="file.id || index" class="ww-file-upload__item">
                <img
                    v-if="isImageFile(file) && getFilePreview(file)"
                    :src="getFilePreview(file)"
                    class="ww-file-upload__item-thumb"
                    :alt="file.name || 'File'"
                />
                <div v-else class="ww-file-upload__item-placeholder">
                    <svg
                        class="ww-file-upload__item-file-icon"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <span class="ww-file-upload__item-name">{{ truncateFileName(file.name) }}</span>
                </div>
                <button
                    v-if="!isDisabled && !isReadonly"
                    class="ww-file-upload__item-remove"
                    type="button"
                    :aria-label="`Remove ${file.name || 'file'}`"
                    @click.stop="removeFile(index)"
                    @mouseenter="isFileItemsIconHovered = true"
                    @mouseleave="isFileItemsIconHovered = false"
                >
                    <span class="ww-file-upload__remove-icon" v-html="removeIconHtml" />
                </button>
            </div>

            <div
                v-if="showAddButton"
                class="ww-file-upload__add"
                role="button"
                tabindex="0"
                :aria-label="addLabelText || 'Add file'"
                @click="openFileExplorer"
                @keydown.enter.prevent="openFileExplorer"
                @keydown.space.prevent="openFileExplorer"
                @mouseenter="isAddButtonHovered = true"
                @mouseleave="isAddButtonHovered = false"
            >
                <span
                    class="ww-file-upload__add-icon-el"
                    :style="{ color: computedAddIconColor, width: computedAddIconSize, height: computedAddIconSize }"
                    v-html="addIconHtml"
                />
                <span v-if="addLabelText" class="ww-file-upload__add-label" :style="addLabelStyle">{{
                    addLabelText
                }}</span>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed, watch, watchEffect, inject, reactive, onBeforeUnmount } from 'vue';
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
    emits: ['trigger-event', 'add-state', 'remove-state', 'update:content:effect'],
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
        const isAddButtonHovered = ref(false);
        const isFileItemsIconHovered = ref(false);

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
        const addCursorStyle = computed(() => (isEditing.value ? 'default' : 'pointer'));

        // Style computeds
        const rowDisplay = computed(() => (props.content?.gridColumns > 0 ? 'grid' : 'flex'));
        const gridTemplateColumns = computed(() =>
            props.content?.gridColumns > 0 ? `repeat(${props.content.gridColumns}, 1fr)` : 'none'
        );
        const computedGridGap = computed(() => props.content?.gridGap || '8px');
        const computedAddButtonGap = computed(() => props.content?.addButtonIconGap || '6px');
        const computedAddButtonBackground = computed(() => props.content?.addButtonBackground || 'transparent');
        const computedAddButtonBorder = computed(() => props.content?.addButtonBorder || '1.5px dashed #ccc');
        const computedBorderRadius = computed(() => props.content?.itemsBorderRadius || '8px');
        const computedItemsAspectRatio = computed(() => props.content?.itemsAspectRatio || '1 / 1');
        const computedRemoveIconColor = computed(() => props.content?.removeIconColor || 'rgba(255, 255, 255, 1)');
        const computedRemoveIconBackground = computed(
            () => props.content?.removeIconBackground || 'rgba(0, 0, 0, 0.45)'
        );
        const computedRemoveIconBorderRadius = computed(() => props.content?.removeIconBorderRadius || '50%');
        const computedAddButtonFocusOutline = computed(
            () => props.content?.addButtonFocusOutline || '2px solid #007aff'
        );
        const computedRemoveIconFocusOutline = computed(
            () => props.content?.removeIconFocusOutline || '2px solid #007aff'
        );
        const computedRemoveIconSize = computed(() => props.content?.removeIconSize || '18px');
        const computedRemoveIconInnerSize = computed(() => `${props.content?.removeIconInnerSize ?? 60}%`);
        const computedAddButtonOpacity = computed(() => props.content?.addButtonOpacity ?? 1);
        const computedFileItemsOpacity = computed(() => props.content?.fileItemsOpacity ?? 1);
        const computedItemsBorder = computed(() => props.content?.itemsBorder || 'none');
        const computedImageObjectFit = computed(() => props.content?.imageObjectFit || 'cover');
        const computedImageObjectPosition = computed(() => props.content?.imageObjectPosition || 'center');

        // Error message templates
        const errorMessages = computed(() => ({
            maxFilesReached: props.content?.errorMsgMaxFilesReached || 'Maximum number of files ({max}) reached',
            tooManyFiles: props.content?.errorMsgTooManyFiles || 'Only {available} more file(s) can be added',
            fileTooSmall: props.content?.errorMsgFileTooSmall || 'File size ({size} MB) is below minimum ({min} MB)',
            fileTooLarge: props.content?.errorMsgFileTooLarge || 'File size ({size} MB) exceeds maximum ({max} MB)',
            totalSizeExceeded:
                props.content?.errorMsgTotalSizeExceeded || 'Total size ({total} MB) exceeds maximum ({max} MB)',
            invalidType: props.content?.errorMsgInvalidType || 'File type "{type}" is not allowed. Accepted: {allowed}',
        }));

        const formatMessage = (template, values) => {
            return template.replace(/\{(\w+)\}/g, (match, key) => {
                return values[key] !== undefined ? values[key] : match;
            });
        };

        const isDisabled = computed(() => {
            /* wwEditor:start */
            if (props.wwEditorState?.isSelected) {
                return props.wwElementState.states.includes('disabled');
            }
            /* wwEditor:end */
            return props.wwElementState.props.disabled === undefined
                ? props.content?.disabled || false
                : props.wwElementState.props.disabled;
        });
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

        const existingFiles = computed(() => componentData.value?.existingFiles || []);
        const newFiles = computed(() => componentData.value?.newFiles || []);
        const deletedFiles = computed(() => componentData.value?.deletedFiles || []);
        const lastInitialValue = ref(null);

        watch(
            () => props.content?.initialValue,
            newInitialValue => {
                const initialArray = Array.isArray(newInitialValue) ? newInitialValue : [];
                const serialized = JSON.stringify(initialArray);
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

        const { getIcon } = wwLib.useIcons();
        const removeIconSvgText = ref(null);
        watchEffect(async () => {
            try {
                if (props.content?.removeIcon) {
                    removeIconSvgText.value = await getIcon(props.content.removeIcon);
                } else {
                    removeIconSvgText.value = null;
                }
            } catch {
                removeIconSvgText.value = null;
            }
        });
        const removeIconHtml = computed(
            () =>
                removeIconSvgText.value ||
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>'
        );

        const addIconSvgText = ref(null);
        watchEffect(async () => {
            try {
                const iconName = typeof props.content?.addIcon === 'string' ? props.content.addIcon : null;
                if (iconName) {
                    addIconSvgText.value = await getIcon(iconName);
                } else {
                    addIconSvgText.value = null;
                }
            } catch {
                addIconSvgText.value = null;
            }
        });
        const addIconHtml = computed(
            () =>
                addIconSvgText.value ||
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'
        );
        const computedAddIconColor = computed(() => props.content?.addIconColor || '#bbbbbb');
        const computedAddIconSize = computed(() => props.content?.addIconSize || '24px');

        const addLabelText = computed(() => props.content?.addLabelValue || '');
        const addLabelStyle = computed(() => ({
            fontSize: props.content?.addLabelFontSize || '12px',
            fontWeight: props.content?.addLabelFontWeight || '400',
            color: props.content?.addLabelColor || '#999999',
        }));

        const useForm = inject('_wwForm:useForm', () => {});
        const fieldName = computed(() => props.content.fieldName);
        const validation = computed(() => props.content.validation);
        const customValidation = computed(() => props.content.customValidation);

        useForm(
            componentData,
            { fieldName, validation, customValidation, required },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue: setComponentData }
        );

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

        // Object URL cache for new file previews
        const previewCache = reactive({});

        const isImageFile = file => {
            const mimeType = file?.mimeType || file?.type || '';
            if (mimeType) return mimeType.startsWith('image/');
            const url = file?.url || file?.src || '';
            return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|tiff?)(\?.*)?$/i.test(url);
        };

        watch(
            fileList,
            newList => {
                const currentIds = new Set(newList.filter(f => f.id).map(f => f.id));

                // Revoke URLs for removed files
                Object.keys(previewCache).forEach(id => {
                    if (!currentIds.has(id)) {
                        try {
                            wwLib.getFrontWindow().URL.revokeObjectURL(previewCache[id]);
                        } catch (e) {
                            // ignore
                        }
                        delete previewCache[id];
                    }
                });

                // Create URLs for new image files (File objects only)
                newList.forEach(file => {
                    if (!isImageFile(file)) return;
                    if (file.url || file.src || file.base64) return;
                    const id = file.id;
                    if (!id || previewCache[id]) return;
                    try {
                        previewCache[id] = wwLib.getFrontWindow().URL.createObjectURL(file);
                    } catch (e) {
                        // ignore
                    }
                });
            },
            { immediate: true }
        );

        onBeforeUnmount(() => {
            Object.values(previewCache).forEach(url => {
                try {
                    wwLib.getFrontWindow().URL.revokeObjectURL(url);
                } catch (e) {
                    // ignore
                }
            });
        });

        const getFilePreview = file => {
            if (file?.url) return file.url;
            if (file?.src) return file.src;
            if (file?.base64) return file.base64;
            return previewCache[file?.id] || null;
        };

        const truncateFileName = name => {
            if (!name) return '';
            if (name.length <= 14) return name;
            const extIndex = name.lastIndexOf('.');
            if (extIndex > 0) {
                return name.slice(0, 8) + '…' + name.slice(extIndex);
            }
            return name.slice(0, 12) + '…';
        };

        const showAddButton = computed(() => {
            if (isReadonly.value) return false;
            if (maxFiles.value > 0) {
                return fileList.value.length < maxFiles.value;
            }
            return true;
        });

        const serializeFile = file => {
            if (!file) return null;
            const plainObject = {};
            for (const key in file) {
                if (Object.prototype.hasOwnProperty.call(file, key)) {
                    plainObject[key] = file[key];
                }
            }
            if (file.name) plainObject.name = file.name;
            if (file.size != null) plainObject.size = file.size;
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

        const handleDragOver = event => {
            if (isDisabled.value || isReadonly.value || !drop.value || isEditing.value) return;
            event.stopPropagation();
            isDragging.value = true;
        };

        const handleDragLeave = event => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            isDragging.value = false;
        };

        const openFileExplorer = () => {
            if (!isDisabled.value && !isReadonly.value && !isEditing.value) {
                fileInput.value?.click();
            }
        };

        const handleDrop = async event => {
            isDragging.value = false;
            if (isDisabled.value || isReadonly.value || !drop.value || isEditing.value) return;

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

        const processFiles = async rawFiles => {
            lastError.value = null;
            const filesToProcess = Array.from(rawFiles);

            let availableSlots = Infinity;
            const currentFileCount = existingFiles.value.length + newFiles.value.length;
            if (maxFiles.value > 0) {
                availableSlots = maxFiles.value - currentFileCount;
                if (availableSlots <= 0) {
                    const message = formatMessage(errorMessages.value.maxFilesReached, { max: maxFiles.value });
                    const errorData = {
                        code: 'MAX_FILES_REACHED',
                        message,
                        data: { maxFiles: maxFiles.value, currentCount: currentFileCount },
                    };
                    lastError.value = errorData;
                    emit('trigger-event', { name: 'error', event: errorData });
                    wwLib.wwNotification.open({ text: { en: message }, color: 'warning' });
                    return;
                } else if (filesToProcess.length > availableSlots) {
                    const message = formatMessage(errorMessages.value.tooManyFiles, { available: availableSlots });
                    const errorData = {
                        code: 'TOO_MANY_FILES',
                        message,
                        data: {
                            providedCount: filesToProcess.length,
                            availableSlots,
                            maxFiles: maxFiles.value,
                            currentCount: currentFileCount,
                        },
                    };
                    lastError.value = errorData;
                    emit('trigger-event', { name: 'error', event: errorData });
                }
            }

            const limitedFiles = filesToProcess.slice(0, availableSlots);
            const processedFiles = [];
            const currentTotalSize = newFiles.value.reduce((sum, f) => sum + (f.size || 0), 0);

            for (const file of limitedFiles) {
                const validationResult = validateFile(file, {
                    maxFileSize: maxFileSize.value,
                    minFileSize: minFileSize.value,
                    maxTotalFileSize: maxTotalFileSize.value,
                    currentTotalSize: currentTotalSize,
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
                    emit('trigger-event', { name: 'error', event: errorData });

                    /* wwEditor:start */
                    wwLib.wwNotification.open({ text: { en: message }, color: 'error' });
                    /* wwEditor:end */
                }
            }

            if (processedFiles.length > 0) {
                const updatedNewFiles = [...newFiles.value, ...processedFiles];
                const newData = {
                    existingFiles: existingFiles.value,
                    newFiles: updatedNewFiles,
                    deletedFiles: deletedFiles.value,
                    allFiles: [...existingFiles.value, ...updatedNewFiles],
                };
                setComponentData(newData);
                emit('trigger-event', { name: 'change', event: { value: newData } });
            }
        };

        const removeFile = index => {
            if (isDisabled.value || isReadonly.value) return;

            const existingCount = existingFiles.value.length;
            let newData;

            if (index < existingCount) {
                const removedImage = existingFiles.value[index];
                const updatedExisting = existingFiles.value.filter((_, i) => i !== index);
                newData = {
                    existingFiles: updatedExisting,
                    newFiles: newFiles.value,
                    deletedFiles: [...deletedFiles.value, removedImage],
                    allFiles: [...updatedExisting, ...newFiles.value],
                };
            } else {
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
            emit('trigger-event', { name: 'change', event: { value: newData } });
        };

        const clearFiles = () => {
            const newData = {
                existingFiles: [],
                newFiles: [],
                deletedFiles: [...deletedFiles.value, ...existingFiles.value],
                allFiles: [],
            };
            setComponentData(newData);
            emit('trigger-event', { name: 'change', event: { value: newData } });
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
        });

        watch(
            isReadonly,
            value => {
                if (value) emit('add-state', 'readonly');
                else emit('remove-state', 'readonly');
            },
            { immediate: true }
        );

        watch(
            isDisabled,
            value => {
                if (value) emit('add-state', 'disabled');
                else emit('remove-state', 'disabled');
            },
            { immediate: true }
        );

        watch(
            isDragging,
            value => {
                if (value && !isDisabled.value && !isReadonly.value) emit('add-state', 'dragging');
                else emit('remove-state', 'dragging');
            },
            { immediate: true }
        );

        watch(
            isAddButtonHovered,
            value => {
                if (value && !isDisabled.value && !isReadonly.value) emit('add-state', 'add-button-hover');
                else emit('remove-state', 'add-button-hover');
            },
            { immediate: true }
        );

        watch(
            isFileItemsIconHovered,
            value => {
                if (value && !isDisabled.value && !isReadonly.value) emit('add-state', 'file-items-icon-hover');
                else emit('remove-state', 'file-items-icon-hover');
            },
            { immediate: true }
        );

        watch(showAddButton, visible => {
            if (!visible) isAddButtonHovered.value = false;
        });

        watch(isDisabled, disabled => {
            if (disabled) {
                isAddButtonHovered.value = false;
                isFileItemsIconHovered.value = false;
            }
        });

        return {
            fileInput,
            fileList,
            hasFiles,
            isDragging,
            isAddButtonHovered,
            isFileItemsIconHovered,
            showAddButton,
            isDisabled,
            isReadonly,
            acceptedFileTypes,
            addCursorStyle,
            rowDisplay,
            gridTemplateColumns,
            computedGridGap,
            computedAddButtonGap,
            computedAddButtonBackground,
            computedAddButtonBorder,
            computedBorderRadius,
            computedItemsAspectRatio,
            computedRemoveIconColor,
            computedRemoveIconBackground,
            computedRemoveIconBorderRadius,
            computedRemoveIconSize,
            computedAddButtonOpacity,
            computedFileItemsOpacity,
            computedItemsBorder,
            computedImageObjectFit,
            computedImageObjectPosition,
            computedAddButtonFocusOutline,
            computedRemoveIconFocusOutline,
            computedRemoveIconInnerSize,
            isImageFile,
            getFilePreview,
            truncateFileName,
            openFileExplorer,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handleFileSelection,
            required,
            removeIconHtml,
            addIconHtml,
            computedAddIconColor,
            computedAddIconSize,
            addLabelText,
            addLabelStyle,
            clearFiles,
            clearError,
            removeFile,

            /* wwEditor:start */
            isEditing,
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

    &__row {
        display: v-bind(rowDisplay);
        flex-direction: row;
        flex-wrap: wrap;
        gap: v-bind(computedGridGap);
        grid-template-columns: v-bind(gridTemplateColumns);
        align-items: flex-start;
        width: 100%;
        height: 100%;
    }

    &__item {
        position: relative;
        width: 100%;
        aspect-ratio: v-bind(computedItemsAspectRatio);
        border: v-bind(computedItemsBorder);
        border-radius: v-bind(computedBorderRadius);
        overflow: hidden;
        background: #f0f0f0;
        flex-shrink: 0;
        opacity: v-bind(computedFileItemsOpacity);
        box-sizing: border-box;
    }

    &__item-thumb {
        width: 100%;
        height: 100%;
        object-fit: v-bind(computedImageObjectFit);
        object-position: v-bind(computedImageObjectPosition);
        display: block;
    }

    &__item-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        padding: 8px;
        box-sizing: border-box;
    }

    &__item-file-icon {
        width: 26px;
        height: 26px;
        color: #aaa;
        flex-shrink: 0;
    }

    &__item-name {
        font-size: 10px;
        color: #666;
        text-align: center;
        line-height: 1.2;
        max-width: 100%;
        overflow: hidden;
        word-break: break-all;
    }

    &__item-remove {
        position: absolute;
        top: 4px;
        right: 4px;
        width: v-bind(computedRemoveIconSize);
        height: v-bind(computedRemoveIconSize);
        background: v-bind(computedRemoveIconBackground);
        border: none;
        border-radius: v-bind(computedRemoveIconBorderRadius);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        flex-shrink: 0;
        color: v-bind(computedRemoveIconColor);
        transition: background 0.15s ease, color 0.15s ease;

        &:focus-visible {
            outline: v-bind(computedRemoveIconFocusOutline);
            outline-offset: 2px;
        }
    }

    &__remove-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: v-bind(computedRemoveIconInnerSize);
        height: v-bind(computedRemoveIconInnerSize);

        :deep(svg) {
            width: 100%;
            height: 100%;
        }
    }

    &__add {
        width: 100%;
        aspect-ratio: v-bind(computedItemsAspectRatio);
        border: v-bind(computedAddButtonBorder);
        border-radius: v-bind(computedBorderRadius);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: v-bind(computedAddButtonGap);
        cursor: v-bind(addCursorStyle);
        flex-shrink: 0;
        background: v-bind(computedAddButtonBackground);
        padding: 8px;
        box-sizing: border-box;
        user-select: none;
        opacity: v-bind(computedAddButtonOpacity);
        transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;

        &:focus-visible {
            outline: v-bind(computedAddButtonFocusOutline);
            outline-offset: 2px;
        }
    }

    &__add-icon-el {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        :deep(svg) {
            width: 100%;
            height: 100%;
            transition: color 0.15s ease;
        }
    }

    &__add-label {
        text-align: center;
        line-height: 1.2;
        transition: color 0.15s ease;
    }

    &--disabled {
        pointer-events: none;
    }
}
</style>
