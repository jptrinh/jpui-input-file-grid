# File Upload

A WeWeb custom file upload component with drag & drop, validation, and customizable dropzone via `wwLayout`.

## Installation

```bash
npm install
npm run serve --port=8080
```

Then add `localhost:8080` as a custom element in the WeWeb editor developer popup.

## Build

```bash
npm run build --name="ww-input-file" --type="element"
```

## Features

### Customizable Dropzone

The upload area uses a `wwLayout` dropzone, so you can drag and drop any WeWeb elements (text, icons, images, buttons) inside it to fully customize the look and feel.

### Single & Multi File Modes

-   **Single** - replaces the current file on each upload
-   **Multi** - accumulates files up to a configurable max count

### Validation

Built-in validation for file size (min/max), total size, file count, and file type. Accepted types include image, video, audio, PDF, CSV, Excel, Word, JSON, or custom extensions.

### Data Encoding

Optionally expose uploaded files as **Base64** or **Binary** data via toggle settings.

## Properties

| Property            | Type               | Default  | Description                                                                      |
| ------------------- | ------------------ | -------- | -------------------------------------------------------------------------------- |
| Initial value       | `Array` (bindable) | `[]`     | Array of existing items to initialize with. Tracked separately from new uploads. |
| Upload type         | `TextSelect`       | `single` | `single` or `multi`                                                              |
| Allow drag & drop   | `OnOff`            | `true`   | Enable/disable drag and drop                                                     |
| Allow reorder       | `OnOff`            | `false`  | Allow reordering files (multi mode only)                                         |
| Max file size (MB)  | `Number`           | `10`     | Maximum size per file                                                            |
| Min file size (MB)  | `Number`           | `0`      | Minimum size per file                                                            |
| Max total size (MB) | `Number`           | `50`     | Maximum combined size (multi mode only)                                          |
| Max number of files | `Number`           | `10`     | File count limit (multi mode only)                                               |
| Required            | `OnOff`            | `false`  | Mark as required                                                                 |
| Read only           | `OnOff`            | `false`  | Prevent uploads                                                                  |
| Allowed file types  | `TextSelect`       | `any`    | Filter by type: any, image, video, audio, pdf, csv, excel, word, json, custom    |
| Custom extensions   | `Text`             | `""`     | Comma-separated extensions when type is `custom` (e.g. `.html, .xml`)            |
| Expose as Base64    | `OnOff`            | `false`  | Include base64 string on each file                                               |
| Expose as Binary    | `OnOff`            | `false`  | Include binary data on each file                                                 |

## Error Messages

All error messages are customizable text properties with placeholder support:

| Property                      | Default                                                  | Placeholders          |
| ----------------------------- | -------------------------------------------------------- | --------------------- |
| Multiple files in single mode | `Multiple files provided in single file mode`            | -                     |
| File too small                | `File size ({size} MB) is below minimum ({min} MB)`      | `{size}`, `{min}`     |
| File too large                | `File size ({size} MB) exceeds maximum ({max} MB)`       | `{size}`, `{max}`     |
| Max files reached             | `Maximum number of files ({max}) reached`                | `{max}`               |
| Too many files                | `Only {available} more file(s) can be added`             | `{available}`         |
| Total size exceeded           | `Total size ({total} MB) exceeds maximum ({max} MB)`     | `{total}`, `{max}`    |
| Invalid file type             | `File type "{type}" is not allowed. Accepted: {allowed}` | `{type}`, `{allowed}` |

## Component Variable

The component exposes a single internal variable called **value** (type: `object`) with this structure:

```js
{
  existingFiles: [],  // Items from initialValue that haven't been removed
  newFiles: [],       // Files added by the user during this session
  deletedFiles: [],   // Items removed from existingFiles
  allFiles: []        // existingFiles + newFiles combined
}
```

## Local Variables

Accessible via `context.local.data?.['fileUpload']` in the formula editor:

| Variable        | Description                           |
| --------------- | ------------------------------------- |
| `existingFiles` | Current items from the initial value  |
| `newFiles`      | Files uploaded by the user            |
| `deletedFiles`  | Items removed from existing files     |
| `allFiles`      | Combined list of existing + new files |
| `status`        | Upload status object                  |
| `error`         | Last error object (or `null`)         |

## Triggers

| Event       | Description                                       | Payload                                                          |
| ----------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| `On change` | Fires when files are added, removed, or reordered | `{ value: { existingFiles, newFiles, deletedFiles, allFiles } }` |
| `On error`  | Fires on validation errors                        | `{ code, message, data }`                                        |

## Component Actions

| Action        | Description                                              | Arguments                                |
| ------------- | -------------------------------------------------------- | ---------------------------------------- |
| Clear Files   | Remove all files and move existing files to deletedFiles | -                                        |
| Clear Error   | Reset the last error state                               | -                                        |
| Remove File   | Remove a file by its index in the combined list          | `index` (Number)                         |
| Reorder Files | Move a file from one position to another                 | `fromIndex` (Number), `toIndex` (Number) |

## States

| State      | Description                                            |
| ---------- | ------------------------------------------------------ |
| `dragging` | Active when a file is being dragged over the component |
| `disabled` | Component is disabled                                  |
| `readonly` | Component is in read-only mode                         |

## Form Integration

When placed inside a WeWeb form container, the component supports `fieldName`, `customValidation`, and `validation` properties for form-level validation.

## Changelog

5/31/2026 - 3.4.0: feat: add image fit, image position, and aspect ratio props for file items and add button
5/30/2026 - 3.3.1: fix: enhance image file validation to include URL checks
