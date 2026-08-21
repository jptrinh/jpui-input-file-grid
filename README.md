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

## File Item Button

The remove button on each file item is styled through the **File item button** group in the style panel:

| Property      | Type                    | Default   | Description                                                                  |
| ------------- | ----------------------- | --------- | ---------------------------------------------------------------------------- |
| Visibility    | `TextSelect` (bindable) | `always`  | `always` (always visible) or `hover` (revealed on file item hover or focus)  |
| Remove icon   | `SystemIcon`            | `lucide/x`| Icon displayed inside the button                                             |
| Button size   | `Length`                | `18px`    | Width and height of the button                                               |
| Icon size (%) | `Number`                | `60`      | Icon size relative to the button                                             |
| Icon color    | `Color`                 | `#ffffff` | Icon color                                                                   |
| Icon background | `Color`               | `rgba(0, 0, 0, 0.45)` | Button background                                                |
| Button radius | `Spacing`               | `50%`     | Button border radius                                                         |
| Button border | `Border`                | `none`    | Button border                                                                |
| Button shadow | `Shadows`               | `none`    | Button box-shadow                                                            |
| Focus outline | `Border`                | `2px solid #007aff` | Outline shown on keyboard focus                                  |

When Visibility is set to `hover`, the button stays reachable by keyboard (it appears on `:focus-visible`), and selecting the `file-items-icon-hover` state in the editor keeps it visible on the canvas so it can still be styled.

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

| State                   | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `dragging`              | Active when a file is being dragged over the component |
| `add-button-hover`      | Active when the add button is hovered                  |
| `file-items-icon-hover` | Active when the remove icon on a file item is hovered  |
| `disabled`              | Component is disabled                                  |
| `readonly`              | Component is in read-only mode                         |

## Form Integration

When placed inside a WeWeb form container, the component supports `fieldName`, `customValidation`, and `validation` properties for form-level validation.

## Changelog

8/21/2026 - 3.6.0: refactor: port the five component states from the legacy add-state/remove-state emit API to selector-based states, and move the state- and class-aware style properties to the ww-config css() hook
8/21/2026 - 3.5.0: feat: add border, shadow and visibility (always / on hover) props for the file item remove button, and split style props into a dedicated "File item button" group
5/31/2026 - 3.4.3: feat: add file-items-icon-hover state, remove removeIconColorHover and removeIconBackgroundHover props
5/31/2026 - 3.4.2: feat: add border prop to file items
5/31/2026 - 3.4.1: fix: change image position property to a select with CSS keyword values
5/31/2026 - 3.4.0: feat: add image fit, image position, and aspect ratio props for file items and add button
5/30/2026 - 3.3.1: fix: enhance image file validation to include URL checks
