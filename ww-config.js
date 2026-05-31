export default {
    editor: {
        label: 'File Upload',
        icon: 'upload',
        bubble: { icon: 'upload' },
        customSettingsPropertiesOrder: [
            // Initial state
            'initialValue',
            // Add button
            'addLabelValue',
            // UX properties
            'drop',
            'maxFileSize',
            'minFileSize',
            'maxTotalFileSize',
            'maxFiles',
            'required',
            'disabled',
            'readonly',
            'extensions',
            'customExtensions',
            'exposeBase64',
            'exposeBinary',
            ['formInfobox', 'fieldName', 'customValidation', 'validation'],
            // Error messages
            {
                label: 'Error messages',
                isCollapsible: true,
                properties: [
                    'errorMsgMaxFilesReached',
                    'errorMsgTooManyFiles',
                    'errorMsgFileTooSmall',
                    'errorMsgFileTooLarge',
                    'errorMsgTotalSizeExceeded',
                    'errorMsgInvalidType',
                ],
            },
        ],
        customStylePropertiesOrder: [
            {
                label: 'Layout',
                isCollapsible: true,
                properties: ['gridColumns', 'gridGap', 'itemsAspectRatio', 'itemsBorderRadius'],
            },
            {
                label: 'Add button',
                isCollapsible: true,
                properties: [
                    'addIcon',
                    'addIconColor',
                    'addIconSize',
                    'addButtonIconGap',
                    'addButtonBackground',
                    'addButtonBorder',
                    'addButtonFocusOutline',
                    'addLabelFontSize',
                    'addLabelFontWeight',
                    'addLabelColor',
                    'addButtonOpacity',
                ],
            },
            {
                label: 'File items',
                isCollapsible: true,
                properties: [
                    'fileItemsOpacity',
                    'imageObjectFit',
                    'imageObjectPosition',
                    'removeIcon',
                    'removeIconSize',
                    'removeIconInnerSize',
                    'removeIconColor',
                    'removeIconBackground',
                    'removeIconColorHover',
                    'removeIconBackgroundHover',
                    'removeIconBorderRadius',
                    'removeIconFocusOutline',
                ],
            },
        ],
        hint: (_, sidePanelContent) => {
            if (!sidePanelContent.parentSelection) return null;
            const { header, text, button, args } = sidePanelContent.parentSelection;
            const sections = ['style', 'settings'];
            return sections.map(section => ({
                section,
                header: header,
                text: text,
                button: {
                    text: button,
                    action: 'selectParent',
                    args,
                },
            }));
        },
    },
    states: ['dragging', 'add-button-hover', 'disabled', 'readonly'],
    options: {
        displayAllowedValues: ['flex', 'inline-flex', 'block'],
    },
    triggerEvents: [
        {
            name: 'change',
            label: { en: 'On change' },
            event: { value: [] },
            default: true,
        },
        {
            name: 'error',
            label: { en: 'On error' },
            event: {
                code: 'VALIDATION_ERROR',
                data: { message: 'File validation failed' },
            },
        },
    ],
    actions: [
        {
            label: 'Clear Files',
            action: 'clearFiles',
        },
        {
            label: 'Clear Error',
            action: 'clearError',
        },
        {
            label: 'Remove File',
            action: 'removeFile',
            args: [
                {
                    name: 'index',
                    type: 'Number',
                },
            ],
        },
    ],
    properties: {
        // ======== ADD BUTTON ========
        addLabelValue: {
            label: { en: 'Label' },
            type: 'Text',
            section: 'settings',
            defaultValue: '',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Text label displayed below the add button icon',
            },
            /* wwEditor:end */
        },
        addIcon: {
            label: { en: 'Icon' },
            type: 'SystemIcon',
            section: 'style',
            defaultValue: 'lucide/upload',
            bindable: true,
            states: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip:
                    'Always use icons full names in binding.\n\n<b>Icons with partial or cut names will not be included in the published app.</b>\n\nEx:\n<code>if(cond, "lucide/upload", "lucide/plus-square")</code>',
            },
            propertyHelp: {
                tooltip:
                    'Always use icons full names in binding.\n\n<b>Icons with partial or cut names will not be included in the published app.</b>',
            },
            /* wwEditor:end */
        },
        addIconColor: {
            label: { en: 'Icon color' },
            type: 'Color',
            section: 'style',
            defaultValue: '#bbbbbb',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },
        addIconSize: {
            label: { en: 'Icon size' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 80 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 5 },
                ],
                noRange: true,
                useVar: true,
            },
            defaultValue: '24px',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },
        addLabelFontSize: {
            label: { en: 'Label font size' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 8, max: 48 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 3 },
                ],
                noRange: true,
                useVar: true,
            },
            defaultValue: '12px',
            bindable: true,
            responsive: true,
        },
        addLabelFontWeight: {
            label: { en: 'Label font weight' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: '300', label: 'Light (300)' },
                    { value: '400', label: 'Regular (400)' },
                    { value: '500', label: 'Medium (500)' },
                    { value: '600', label: 'Semi-bold (600)' },
                    { value: '700', label: 'Bold (700)' },
                ],
            },
            defaultValue: '400',
            bindable: true,
            responsive: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Font weight for the label: 300 | 400 | 500 | 600 | 700',
            },
            /* wwEditor:end */
        },
        addLabelColor: {
            label: { en: 'Label color' },
            type: 'Color',
            section: 'style',
            defaultValue: '#999999',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },
        // ======== INITIAL STATE ========
        initialValue: {
            label: { en: 'Initial value' },
            type: 'Array',
            section: 'settings',
            bindable: true,
            defaultValue: [],
            /* wwEditor:start */
            bindingValidation: {
                type: 'array',
                tooltip: 'Array of existing items to initialize the component with',
            },
            propertyHelp: {
                tooltip: 'Bind an array of existing items. These will be tracked separately from new uploads.',
            },
            /* wwEditor:end */
        },

        drop: {
            label: { en: 'Allow drag & drop' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: true,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'A boolean that defines if drag and drop is enabled: `true | false`',
            },
            /* wwEditor:end */
        },
        maxFileSize: {
            label: { en: 'Max file size (MB)' },
            type: 'Number',
            options: { min: 0 },
            section: 'settings',
            defaultValue: 10,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'A number that defines the maximum allowed file size in MB: `10`',
            },
            /* wwEditor:end */
        },
        minFileSize: {
            label: { en: 'Min file size (MB)' },
            type: 'Number',
            options: { min: 0 },
            section: 'settings',
            defaultValue: 0,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'A number that defines the minimum allowed file size in MB: `0`',
            },
            /* wwEditor:end */
        },
        maxTotalFileSize: {
            label: { en: 'Max total size (MB)' },
            type: 'Number',
            options: { min: 0 },
            section: 'settings',
            defaultValue: 50,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'A number that defines the maximum total file size in MB: `50`',
            },
            /* wwEditor:end */
        },
        maxFiles: {
            label: { en: 'Max number of files' },
            type: 'Number',
            options: { min: 1 },
            section: 'settings',
            defaultValue: 10,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'A number that defines the maximum number of files allowed: `10`',
            },
            /* wwEditor:end */
        },
        required: {
            label: { en: 'Required' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'A boolean that defines if the upload is required: `true | false`',
            },
            /* wwEditor:end */
        },
        disabled: {
            label: { en: 'Disabled' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            hidden: (content, sidePanelContent, boundProps, wwProps) => !!(wwProps && wwProps.disabled !== undefined),
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'A boolean that defines if the upload is disabled: `true | false`',
            },
            /* wwEditor:end */
        },
        readonly: {
            label: { en: 'Read only' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            hidden: (content, sidePanelContent, boundProps, wwProps) => !!(wwProps && wwProps.readonly !== undefined),
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'A boolean that defines if the upload is in readonly mode: `true | false`',
            },
            /* wwEditor:end */
        },
        extensions: {
            label: { en: 'Allowed file types' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'any', label: { en: 'Any' } },
                    { value: 'image', label: { en: 'Image' } },
                    { value: 'video', label: { en: 'Video' } },
                    { value: 'audio', label: { en: 'Audio' } },
                    { value: 'pdf', label: { en: 'PDF' } },
                    { value: 'csv', label: { en: 'CSV' } },
                    { value: 'excel', label: { en: 'Excel' } },
                    { value: 'word', label: { en: 'Word' } },
                    { value: 'json', label: { en: 'JSON' } },
                    { value: 'custom', label: { en: 'Custom' } },
                ],
            },
            section: 'settings',
            defaultValue: 'any',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'A string that defines the allowed file types: `"any" | "image" | "video" | "custom"`',
            },
            /* wwEditor:end */
        },
        customExtensions: {
            type: 'Text',
            options: { placeholder: '.html, .xml, .pt' },
            section: 'settings',
            hidden: content => content.extensions !== 'custom',
            defaultValue: '',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'A comma-separated list of allowed file extensions: `".html, .xml, .pt"`',
            },
            /* wwEditor:end */
        },
        exposeBase64: {
            label: { en: 'Expose as Base64' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'A boolean that defines if files should be exposed as Base64: `true | false`',
            },
            propertyHelp: {
                tooltip:
                    "Base64 strings can be very large, so we crop them when displayed in the editor interface. Don't worry, the variable contains the full value when it is used.",
            },
            /* wwEditor:end */
        },
        exposeBinary: {
            label: { en: 'Expose as Binary' },
            type: 'OnOff',
            section: 'settings',
            defaultValue: false,
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'boolean',
                tooltip: 'A boolean that defines if files should be exposed as Binary: `true | false`',
            },
            propertyHelp: {
                tooltip:
                    'Binary data is a special object that can be very large in size. It will appear as an empty object in the editor interface. To inspect it, you can log it to the console.',
            },
            /* wwEditor:end */
        },

        // ======== ERROR MESSAGE PROPERTIES ========
        errorMsgMaxFilesReached: {
            label: { en: 'Max files reached' },
            type: 'Text',
            section: 'settings',
            options: { placeholder: 'Maximum number of files ({max}) reached' },
            defaultValue: 'Maximum number of files ({max}) reached',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Error message when max files limit is reached. Use {max} for the limit value.',
            },
            /* wwEditor:end */
        },
        errorMsgTooManyFiles: {
            label: { en: 'Too many files' },
            type: 'Text',
            section: 'settings',
            options: { placeholder: 'Only {available} more file(s) can be added' },
            defaultValue: 'Only {available} more file(s) can be added',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Error message when too many files are selected. Use {available} for remaining slots.',
            },
            /* wwEditor:end */
        },
        errorMsgFileTooSmall: {
            label: { en: 'File too small' },
            type: 'Text',
            section: 'settings',
            options: { placeholder: 'File size ({size} MB) is below minimum ({min} MB)' },
            defaultValue: 'File size ({size} MB) is below minimum ({min} MB)',
            bindable: true,
            hidden: content => !content.minFileSize || content.minFileSize <= 0,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Error message when file is too small. Use {size} for file size, {min} for minimum.',
            },
            /* wwEditor:end */
        },
        errorMsgFileTooLarge: {
            label: { en: 'File too large' },
            type: 'Text',
            section: 'settings',
            options: { placeholder: 'File size ({size} MB) exceeds maximum ({max} MB)' },
            defaultValue: 'File size ({size} MB) exceeds maximum ({max} MB)',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Error message when file is too large. Use {size} for file size, {max} for maximum.',
            },
            /* wwEditor:end */
        },
        errorMsgTotalSizeExceeded: {
            label: { en: 'Total size exceeded' },
            type: 'Text',
            section: 'settings',
            options: { placeholder: 'Total size ({total} MB) exceeds maximum ({max} MB)' },
            defaultValue: 'Total size ({total} MB) exceeds maximum ({max} MB)',
            bindable: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Error message when total size exceeds limit. Use {total} for total size, {max} for maximum.',
            },
            /* wwEditor:end */
        },
        errorMsgInvalidType: {
            label: { en: 'Invalid file type' },
            type: 'Text',
            section: 'settings',
            options: { placeholder: 'File type "{type}" is not allowed. Accepted: {allowed}' },
            defaultValue: 'File type "{type}" is not allowed. Accepted: {allowed}',
            bindable: true,
            hidden: content => content.extensions === 'any',
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'Error message for invalid file type. Use {type} for file type, {allowed} for accepted types.',
            },
            /* wwEditor:end */
        },

        // ======== STYLE PROPERTIES ========
        // Layout
        gridColumns: {
            label: { en: 'Columns' },
            type: 'Number',
            section: 'style',
            options: { min: 0, step: 1 },
            defaultValue: 3,
            bindable: true,
            responsive: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'Number of grid columns. Set to 0 for automatic flex-wrap layout.',
            },
            propertyHelp: {
                tooltip: 'Set to 0 for automatic layout (items wrap), or enter a number for a fixed column grid.',
            },
            /* wwEditor:end */
        },
        itemsAspectRatio: {
            label: { en: 'Aspect ratio' },
            type: 'Text',
            section: 'style',
            options: { placeholder: '1 / 1' },
            defaultValue: '1 / 1',
            bindable: true,
            responsive: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'CSS aspect-ratio for file items and the add button. Examples: 1 / 1 | 4 / 3 | 16 / 9 | 3 / 4',
            },
            propertyHelp: {
                tooltip: 'Applies to both file item thumbnails and the add button. Use standard CSS aspect-ratio syntax, e.g. 1 / 1, 4 / 3, 16 / 9.',
            },
            /* wwEditor:end */
        },
        gridGap: {
            label: { en: 'Gap' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 100 },
                    { value: 'rem', label: 'rem', min: 0, max: 10 },
                    { value: '%', label: '%', min: 0, max: 50 },
                ],
                noRange: true,
                useVar: true,
            },
            defaultValue: '8px',
            bindable: true,
            responsive: true,
        },
        // Add button
        addButtonIconGap: {
            label: { en: 'Icon & label gap' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 50 },
                    { value: 'rem', label: 'rem', min: 0, max: 5 },
                ],
                noRange: true,
                useVar: true,
            },
            defaultValue: '6px',
            bindable: true,
            responsive: true,
        },
        addButtonBackground: {
            label: { en: 'Background' },
            type: 'Color',
            section: 'style',
            defaultValue: 'transparent',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },
        addButtonBorder: {
            type: 'Border',
            label: { en: 'Border' },
            section: 'style',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
            defaultValue: '1.5px dashed #ccc',
        },
        addButtonFocusOutline: {
            type: 'Border',
            label: { en: 'Focus outline' },
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '2px solid #007aff',
        },
        addButtonOpacity: {
            label: { en: 'Opacity' },
            type: 'Number',
            section: 'style',
            options: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1,
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'Opacity of the add button, between 0 and 1.',
            },
            /* wwEditor:end */
        },
        // File items
        imageObjectFit: {
            label: { en: 'Image fit' },
            type: 'TextSelect',
            section: 'style',
            options: {
                options: [
                    { value: 'cover', label: 'Cover' },
                    { value: 'contain', label: 'Contain' },
                    { value: 'fill', label: 'Fill' },
                    { value: 'none', label: 'None' },
                    { value: 'scale-down', label: 'Scale down' },
                ],
            },
            defaultValue: 'cover',
            bindable: true,
            responsive: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'How images fill the file item: cover | contain | fill | none | scale-down',
            },
            propertyHelp: {
                tooltip: 'Controls the CSS object-fit property on image thumbnails.',
            },
            /* wwEditor:end */
        },
        imageObjectPosition: {
            label: { en: 'Image position' },
            type: 'Text',
            section: 'style',
            options: { placeholder: 'center' },
            defaultValue: 'center',
            bindable: true,
            responsive: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip: 'CSS object-position for image thumbnails. Examples: center | top | bottom left | 50% 25%',
            },
            propertyHelp: {
                tooltip: 'Controls where the image is anchored within the file item. Only applies when Image fit is not "fill".',
            },
            /* wwEditor:end */
        },
        fileItemsOpacity: {
            label: { en: 'Opacity' },
            type: 'Number',
            section: 'style',
            options: { min: 0, max: 1, step: 0.01 },
            defaultValue: 1,
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'number',
                tooltip: 'Opacity of the file items, between 0 and 1.',
            },
            /* wwEditor:end */
        },
        removeIcon: {
            label: { en: 'Remove icon' },
            type: 'SystemIcon',
            section: 'style',
            defaultValue: 'lucide/x',
            bindable: true,
            states: true,
            /* wwEditor:start */
            bindingValidation: {
                type: 'string',
                tooltip:
                    'Always use icons full names in binding.\n\n<b>Icons with partial or cut names will not be included in the published app.</b>\n\nEx:\n<code>if(cond, "lucide/x", "lucide/x-circle")</code>',
            },
            propertyHelp: {
                tooltip:
                    'Always use icons full names in binding.\n\n<b>Icons with partial or cut names will not be included in the published app.</b>',
            },
            /* wwEditor:end */
        },
        removeIconSize: {
            label: { en: 'Button size' },
            type: 'Length',
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 10, max: 60 },
                    { value: 'rem', label: 'rem', min: 0.5, max: 4 },
                ],
                noRange: true,
                useVar: true,
            },
            defaultValue: '18px',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },
        removeIconInnerSize: {
            label: { en: 'Icon size (%)' },
            type: 'Number',
            section: 'style',
            options: { min: 10, max: 100, step: 1 },
            defaultValue: 60,
            bindable: true,
            responsive: true,
        },
        removeIconColor: {
            label: { en: 'Icon color' },
            type: 'Color',
            section: 'style',
            defaultValue: 'rgba(255, 255, 255, 1)',
            bindable: true,
            responsive: true,
        },
        removeIconBackground: {
            label: { en: 'Icon background' },
            type: 'Color',
            section: 'style',
            defaultValue: 'rgba(0, 0, 0, 0.45)',
            bindable: true,
            responsive: true,
        },
        removeIconColorHover: {
            label: { en: 'Icon color (hover)' },
            type: 'Color',
            section: 'style',
            defaultValue: 'rgba(255, 255, 255, 1)',
            bindable: true,
            responsive: true,
        },
        removeIconBackgroundHover: {
            label: { en: 'Background (hover)' },
            type: 'Color',
            section: 'style',
            defaultValue: 'rgba(0, 0, 0, 0.7)',
            bindable: true,
            responsive: true,
        },
        removeIconBorderRadius: {
            type: 'Spacing',
            label: { en: 'Button radius' },
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 100 },
                    { value: '%', label: '%', min: 0, max: 100 },
                ],
                isCorner: false,
                noRange: true,
                useVar: true,
            },
            defaultValue: '50%',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },
        removeIconFocusOutline: {
            type: 'Border',
            label: { en: 'Focus outline' },
            section: 'style',
            bindable: true,
            responsive: true,
            classes: true,
            defaultValue: '2px solid #007aff',
        },
        itemsBorderRadius: {
            type: 'Spacing',
            label: { en: 'Border radius' },
            section: 'style',
            options: {
                unitChoices: [
                    { value: 'px', label: 'px', min: 0, max: 200 },
                    { value: '%', label: '%', min: 0, max: 50 },
                ],
                isCorner: true,
                noRange: true,
                useVar: true,
            },
            defaultValue: '8px',
            bindable: true,
            responsive: true,
            states: true,
            classes: true,
        },

        // FORM PROPERTIES: Mainly used in the sidepanel for UX purposes
        /* wwEditor:start */
        parentSelection: {
            editorOnly: true,
            defaultValue: false,
        },
        /* wwEditor:end */
        /* wwEditor:start */
        form: {
            editorOnly: true,
            hidden: true,
            defaultValue: false,
        },
        formInfobox: {
            type: 'InfoBox',
            section: 'settings',
            options: (_, sidePanelContent) => ({
                variant: sidePanelContent.form?.name ? 'success' : 'warning',
                icon: 'pencil',
                title: sidePanelContent.form?.name || 'Unnamed form',
                content: !sidePanelContent.form?.name && 'Give your form a meaningful name.',
            }),
            hidden: (_, sidePanelContent) => !sidePanelContent.form?.uid,
        },
        /* wwEditor:end */
        fieldName: {
            label: 'Field name',
            section: 'settings',
            type: 'Text',
            defaultValue: '',
            bindable: true,
            hidden: (_, sidePanelContent) => {
                return !sidePanelContent.form?.uid;
            },
        },
        customValidation: {
            label: 'Custom validation',
            section: 'settings',
            type: 'OnOff',
            defaultValue: false,
            bindable: true,
            hidden: (_, sidePanelContent) => {
                return !sidePanelContent.form?.uid;
            },
        },
        validation: {
            label: 'Validation',
            section: 'settings',
            type: 'Formula',
            defaultValue: '',
            bindable: false,
            hidden: (content, sidePanelContent) => {
                return !sidePanelContent.form?.uid || !content.customValidation;
            },
        },
    },
};
