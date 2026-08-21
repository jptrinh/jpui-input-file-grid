<template>
    <div
        class="ww-file-upload"
        :class="{
            'ww-file-upload--disabled': isDisabled,
            'ww-file-upload--interaction-blocked': isInteractionBlocked,
        }"
        :data-ww-dragging="isDraggingState ? 'true' : null"
        :data-ww-disabled="isDisabled ? 'true' : null"
        :data-ww-readonly="isReadonly ? 'true' : null"
        :data-ww-error="hasError ? 'true' : null"
        @dragenter="handleDragEnter"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
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
            tabindex="-1"
            aria-hidden="true"
            @change="handleFileSelection"
        />

        <div class="ww-file-upload__row">
            <div
                v-for="(file, index) in fileList"
                :key="file.id || index"
                class="ww-file-upload__item"
                :class="{
                    'ww-file-upload__item--reorderable': canReorder,
                    'ww-file-upload__item--dragged': draggedIndex === index,
                    'ww-file-upload__item--drag-over':
                        draggedIndex !== null && dragOverIndex === index && draggedIndex !== index,
                }"
                :draggable="canReorder"
                :tabindex="canReorder ? 0 : null"
                :aria-label="canReorder ? fileItemLabel(file, index) : null"
                @keydown="handleItemKeydown($event, index)"
                @dragstart="handleItemDragStart($event, index)"
                @dragover="handleItemDragOver($event, index)"
                @drop="handleItemDrop($event, index)"
                @dragend="handleItemDragEnd"
            >
                <img
                    v-if="isImageFile(file) && getFilePreview(file)"
                    :src="getFilePreview(file)"
                    class="ww-file-upload__item-thumb"
                    :alt="file.name || 'File'"
                    draggable="false"
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
                    :class="{ 'ww-file-upload__item-remove--hover-only': isRemoveButtonHoverOnly }"
                    type="button"
                    :aria-label="`Remove ${file.name || 'file'}`"
                    @click.stop="removeFile(index)"
                >
                    <span class="ww-file-upload__remove-icon" v-html="removeIconHtml" />
                </button>
            </div>

            <div
                v-if="showAddButton"
                class="ww-file-upload__add"
                role="button"
                :tabindex="isDisabled ? -1 : 0"
                :aria-disabled="isDisabled ? 'true' : null"
                :aria-label="addLabelText || 'Add file'"
                @click="openFileExplorer"
                @keydown.enter.prevent="openFileExplorer"
                @keydown.space.prevent="openFileExplorer"
            >
                <span class="ww-file-upload__add-icon-el" v-html="addIconHtml" />
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
    emits: [
        'trigger-event',
        // Not emitted here, but useForm is handed `emit` and may raise validation states.
        'add-state',
        'remove-state',
        // Editor only: raised by useParentSelection.
        'update:sidepanel-content',
    ],
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

        // `pointer-events: none` also removes the root from hit-testing, which swallows the
        // editor's selection click and makes the element unselectable on the canvas. Every
        // handler already guards on isDisabled, so while editing the cursor hint is enough.
        const isInteractionBlocked = computed(() => isDisabled.value && !isEditing.value);

        // Style computeds
        const rowDisplay = computed(() => (props.content?.gridColumns > 0 ? 'grid' : 'flex'));
        const gridTemplateColumns = computed(() =>
            props.content?.gridColumns > 0 ? `repeat(${props.content.gridColumns}, 1fr)` : 'none'
        );
        const computedGridGap = computed(() => props.content?.gridGap || '8px');
        const computedAddButtonGap = computed(() => props.content?.addButtonIconGap || '6px');
        const computedItemsAspectRatio = computed(() => props.content?.itemsAspectRatio || '1 / 1');
        const isRemoveButtonHoverOnly = computed(() => {
            if (props.content?.removeIconVisibility !== 'hover') return false;
            /* wwEditor:start */
            // Keep the button visible in the editor when previewing its hover state
            if (props.wwElementState?.states?.includes('file-items-icon-hover')) return false;
            /* wwEditor:end */
            return true;
        });
        const computedRemoveIconInnerSize = computed(() => `${props.content?.removeIconInnerSize ?? 60}%`);
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
                return props.wwElementState?.states?.includes('disabled') ?? false;
            }
            /* wwEditor:end */
            const stateProp = props.wwElementState?.props?.disabled;
            return stateProp === undefined ? props.content?.disabled || false : stateProp;
        });
        const isReadonly = computed(() => {
            /* wwEditor:start */
            if (props.wwEditorState?.isSelected) {
                return props.wwElementState?.states?.includes('readonly') ?? false;
            }
            /* wwEditor:end */
            const stateProp = props.wwElementState?.props?.readonly;
            return stateProp === undefined ? props.content?.readonly || false : stateProp;
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

        // `allFiles` is the authoritative, ordered list. `existingFiles` and `newFiles` are
        // views over it, so `isNew` is pure provenance (came from initialValue vs uploaded
        // now) rather than doubling as position — which is what lets a file be reordered
        // across the boundary without changing what it is.
        const allFiles = computed(() => componentData.value?.allFiles || []);
        const existingFiles = computed(() => allFiles.value.filter(file => !file?.isNew));
        const newFiles = computed(() => allFiles.value.filter(file => file?.isNew));
        const deletedFiles = computed(() => componentData.value?.deletedFiles || []);
        const lastInitialValue = ref(null);

        const buildValue = (files, deleted) => ({
            allFiles: files,
            existingFiles: files.filter(file => !file?.isNew),
            newFiles: files.filter(file => file?.isNew),
            deletedFiles: deleted,
        });

        let fileIdCounter = 0;
        const generateFileId = () =>
            `file-${Date.now()}-${(fileIdCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

        // Reordering needs a stable identity per file: index keys make Vue reuse the wrong
        // node when the list moves, and the status map needs something better than the file
        // name, which two uploads can share.
        const withFileIdentity = (file, isNew) => ({
            ...file,
            id: file?.id || generateFileId(),
            isNew,
        });

        // The component's value is an object, so a form reset has to restore that whole
        // shape — handing the form the raw initialValue array would reset the field to
        // something no consumer of the variable can read.
        const initialValue = computed(() => {
            const initialArray = Array.isArray(props.content?.initialValue) ? props.content.initialValue : [];
            return buildValue(
                initialArray.map(file => withFileIdentity(file, false)),
                []
            );
        });

        watch(
            () => props.content?.initialValue,
            newInitialValue => {
                // Compare the raw prop, not the normalised value: the generated ids differ on
                // every evaluation and would make every content change look like a new list.
                const serialized = JSON.stringify(Array.isArray(newInitialValue) ? newInitialValue : []);
                if (serialized !== lastInitialValue.value) {
                    lastInitialValue.value = serialized;
                    setComponentData(initialValue.value);
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

        // The `error` state is applicative. An error cannot realistically be provoked on the
        // canvas, so honour the state picker there the way dragging does.
        const hasError = computed(() => {
            /* wwEditor:start */
            if (props.wwEditorState?.isSelected) {
                return props.wwElementState?.states?.includes('error') ?? false;
            }
            /* wwEditor:end */
            return lastError.value !== null;
        });

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
        const addLabelText = computed(() => props.content?.addLabelValue || '');
        const addLabelStyle = computed(() => ({
            fontSize: props.content?.addLabelFontSize || '12px',
            fontWeight: props.content?.addLabelFontWeight || '400',
        }));

        const useForm = inject('_wwForm:useForm', () => {});
        const fieldName = computed(() => props.content?.fieldName);
        const validation = computed(() => props.content?.validation);
        const customValidation = computed(() => props.content?.customValidation);

        useForm(
            componentData,
            { fieldName, validation, customValidation, initialValue, required },
            { elementState: props.wwElementState, emit, sidepanelFormPath: 'form', setValue: setComponentData }
        );

        const fileList = allFiles;
        const hasFiles = computed(() => fileList.value.length > 0);

        watch([status, fileList], ([newStatus, files]) => {
            if (newStatus && typeof newStatus === 'object') {
                const fileKeys = files.flatMap(file => [file?.id, file?.name].filter(Boolean));
                const updatedStatus = Object.fromEntries(
                    Object.entries(newStatus).filter(([key]) => fileKeys.includes(key))
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

        const fileItemLabel = (file, index) => {
            const name = file?.name || 'File';
            if (!canReorder.value) return name;
            return `${name}, ${index + 1} of ${
                allFiles.value.length
            }. Press control or command with the arrow keys to move it.`;
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
                allFiles: computed(() => allFiles.value.map(serializeFile)),
                status: status,
                error: lastError,
            },
        });

        // The `dragging` state is applicative: it is exposed as an attribute the state
        // selector matches, and stays off while the component cannot accept a drop.
        const isDraggingState = computed(() => {
            /* wwEditor:start */
            // Dropping is blocked while editing, so a real drag can never raise this state
            // on the canvas — honour the state picker instead, or it could never be styled.
            if (props.wwEditorState?.isSelected) {
                return props.wwElementState?.states?.includes('dragging') ?? false;
            }
            /* wwEditor:end */
            return isDragging.value && !isDisabled.value && !isReadonly.value;
        });

        const canAcceptDrop = computed(
            () =>
                !isDisabled.value &&
                !isReadonly.value &&
                drop.value &&
                !isEditing.value &&
                // A reorder drag is internal: it must not raise the incoming-file state.
                draggedIndex.value === null
        );

        const canReorder = computed(
            () =>
                !!props.content?.allowReorder &&
                !isDisabled.value &&
                !isReadonly.value &&
                !isEditing.value &&
                allFiles.value.length > 1
        );

        // Cancelling `dragenter` is what makes this element the drag's current target. Without
        // it the browser retargets to the document, `dragover` never fires here, and the drop
        // falls through to the browser's own "open this file" handling.
        //
        // Both are cancelled unconditionally: claiming the target even when the component
        // cannot accept files is what stops a stray drop from navigating away from the app.
        // dropEffect is what tells the user which of the two is happening.
        const handleDragEnter = event => {
            event.preventDefault();
            if (!canAcceptDrop.value) return;
            event.stopPropagation();
            isDragging.value = true;
        };

        const handleDragOver = event => {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = canAcceptDrop.value ? 'copy' : 'none';
            }
            if (!canAcceptDrop.value) return;
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
            if (!canAcceptDrop.value) return;

            event.stopPropagation();
            const items = event.dataTransfer?.files;
            if (!items?.length) return;

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
            const currentFileCount = allFiles.value.length;
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
                    file.id = generateFileId();
                    file.isNew = true;
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
                const newData = buildValue([...allFiles.value, ...processedFiles], deletedFiles.value);
                setComponentData(newData);
                emit('trigger-event', { name: 'change', event: { value: newData } });
            }
        };

        const removeFile = index => {
            if (isDisabled.value || isReadonly.value) return;

            const files = [...allFiles.value];
            if (!Number.isInteger(index) || index < 0 || index >= files.length) return;

            const [removed] = files.splice(index, 1);
            // Only files that came from initialValue are reported as deleted: a new file that
            // is removed before submission never existed as far as the backend is concerned.
            const updatedDeleted = removed && !removed.isNew ? [...deletedFiles.value, removed] : deletedFiles.value;

            const newData = buildValue(files, updatedDeleted);
            setComponentData(newData);
            emit('trigger-event', { name: 'change', event: { value: newData } });
        };

        const reorderFiles = (fromIndex, toIndex) => {
            if (isDisabled.value || isReadonly.value) return;

            const files = [...allFiles.value];
            const from = Number(fromIndex);
            const to = Number(toIndex);
            if (!Number.isInteger(from) || !Number.isInteger(to)) return;
            if (from < 0 || from >= files.length || to < 0 || to >= files.length || from === to) return;

            const [moved] = files.splice(from, 1);
            files.splice(to, 0, moved);

            const newData = buildValue(files, deletedFiles.value);
            setComponentData(newData);
            emit('trigger-event', {
                name: 'reorder',
                event: { value: newData, fromIndex: from, toIndex: to, file: serializeFile(moved) },
            });
            emit('trigger-event', { name: 'change', event: { value: newData } });
        };

        // Item drags and the root's incoming-file drop are two separate drag systems sharing
        // one subtree. The item handlers stop propagation so the root never sees a reorder
        // drag, and draggedIndex keeps the root's own state suppressed for the dragenter that
        // fires before any item handler runs.
        const handleItemDragStart = (event, index) => {
            if (!canReorder.value) return;
            draggedIndex.value = index;
            dragOverIndex.value = index;
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                // Firefox will not start a drag unless some data is attached.
                try {
                    event.dataTransfer.setData('text/plain', String(index));
                } catch (e) {
                    // ignore
                }
            }
        };

        const handleItemDragOver = (event, index) => {
            if (draggedIndex.value === null) return;
            event.preventDefault();
            event.stopPropagation();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
            dragOverIndex.value = index;
        };

        const handleItemDrop = (event, index) => {
            if (draggedIndex.value === null) return;
            event.preventDefault();
            event.stopPropagation();
            const from = draggedIndex.value;
            draggedIndex.value = null;
            dragOverIndex.value = null;
            reorderFiles(from, index);
        };

        // Drag-only reordering is unusable without a pointer. ctrl/cmd + arrow moves the
        // focused file; the plain arrows are left alone so they keep their normal meaning.
        const handleItemKeydown = (event, index) => {
            if (!canReorder.value) return;
            if (!event.ctrlKey && !event.metaKey) return;

            const backwards = event.key === 'ArrowLeft' || event.key === 'ArrowUp';
            const forwards = event.key === 'ArrowRight' || event.key === 'ArrowDown';
            if (!backwards && !forwards) return;

            const target = backwards ? index - 1 : index + 1;
            if (target < 0 || target >= allFiles.value.length) return;

            event.preventDefault();
            // Items are keyed by id, so Vue moves the existing node rather than recreating it
            // and focus stays with the file the user is moving.
            reorderFiles(index, target);
        };

        const handleItemDragEnd = () => {
            draggedIndex.value = null;
            dragOverIndex.value = null;
        };

        const clearFiles = () => {
            const newData = buildValue([], [...deletedFiles.value, ...existingFiles.value]);
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
            reorderFiles: {
                description: 'Move a file from one position to another in allFiles',
                method: reorderFiles,
                editor: { label: 'Reorder Files', group: 'File Upload', icon: 'sort' },
            },
            removeFile: {
                description: 'Remove a file by index',
                method: removeFile,
                editor: { label: 'Remove File', group: 'File Upload', icon: 'minus' },
            },
        });

        return {
            fileInput,
            fileList,
            allFiles,
            hasFiles,
            isDraggingState,
            hasError,
            isInteractionBlocked,
            showAddButton,
            isDisabled,
            isReadonly,
            acceptedFileTypes,
            addCursorStyle,
            rowDisplay,
            gridTemplateColumns,
            computedGridGap,
            computedAddButtonGap,
            computedItemsAspectRatio,
            isRemoveButtonHoverOnly,
            computedImageObjectFit,
            computedImageObjectPosition,
            computedRemoveIconInnerSize,
            isImageFile,
            getFilePreview,
            truncateFileName,
            openFileExplorer,
            handleDragEnter,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handleFileSelection,
            required,
            removeIconHtml,
            addIconHtml,
            addLabelText,
            addLabelStyle,
            clearFiles,
            clearError,
            removeFile,
            reorderFiles,
            canReorder,
            draggedIndex,
            dragOverIndex,
            handleItemDragStart,
            handleItemDragOver,
            handleItemDrop,
            handleItemDragEnd,
            handleItemKeydown,
            fileItemLabel,

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
        border: var(--ww-fu-item-border, none);
        border-radius: var(--ww-fu-item-radius, 8px);
        overflow: hidden;
        background: #f0f0f0;
        flex-shrink: 0;
        opacity: var(--ww-fu-item-opacity, 1);
        box-sizing: border-box;
    }

    &__item--reorderable {
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }

    &__item--reorderable:focus-visible {
        outline: var(--ww-fu-add-focus-outline, 2px solid #007aff);
        outline-offset: 2px;
    }

    &__item--dragged {
        opacity: 0.4;
    }

    &__item--drag-over {
        outline: 2px dashed currentColor;
        outline-offset: -2px;
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
        width: var(--ww-fu-remove-size, 18px);
        height: var(--ww-fu-remove-size, 18px);
        background: var(--ww-fu-remove-bg, rgba(0, 0, 0, 0.45));
        border: var(--ww-fu-remove-border, none);
        border-radius: var(--ww-fu-remove-radius, 50%);
        box-shadow: var(--ww-fu-remove-shadow, none);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        flex-shrink: 0;
        color: var(--ww-fu-remove-color, rgba(255, 255, 255, 1));
        transition: background 0.15s ease, color 0.15s ease, opacity 0.15s ease, border-color 0.15s ease,
            box-shadow 0.15s ease;

        &:focus-visible {
            outline: var(--ww-fu-remove-focus-outline, 2px solid #007aff);
            outline-offset: 2px;
        }
    }

    &__item-remove--hover-only {
        opacity: 0;
        pointer-events: none;

        &:focus-visible {
            opacity: 1;
            pointer-events: auto;
        }
    }

    &__item:hover &__item-remove--hover-only {
        opacity: 1;
        pointer-events: auto;
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
        border: var(--ww-fu-add-border, 1.5px dashed #ccc);
        border-radius: var(--ww-fu-item-radius, 8px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: v-bind(computedAddButtonGap);
        cursor: v-bind(addCursorStyle);
        flex-shrink: 0;
        background: var(--ww-fu-add-bg, transparent);
        padding: 8px;
        box-sizing: border-box;
        user-select: none;
        opacity: var(--ww-fu-add-opacity, 1);
        transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;

        &:focus-visible {
            outline: var(--ww-fu-add-focus-outline, 2px solid #007aff);
            outline-offset: 2px;
        }
    }

    &__add-icon-el {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        color: var(--ww-fu-add-icon-color, #bbbbbb);
        width: var(--ww-fu-add-icon-size, 24px);
        height: var(--ww-fu-add-icon-size, 24px);

        :deep(svg) {
            width: 100%;
            height: 100%;
            transition: color 0.15s ease;
        }
    }

    &__add-label {
        color: var(--ww-fu-add-label-color, #999999);
        text-align: center;
        line-height: 1.2;
        transition: color 0.15s ease;
    }

    &--disabled {
        cursor: not-allowed;
    }

    &--interaction-blocked {
        pointer-events: none;
    }
}
</style>
