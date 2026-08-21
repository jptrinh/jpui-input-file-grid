# JPUI Input File Grid

A WeWeb custom file upload component with drag & drop, validation, and customizable dropzone via `wwLayout`.

## Installation

```bash
npm install
npm run serve --port=8080
```

Then add `localhost:8080` as a custom element in the WeWeb editor developer popup.

## Build

```bash
npx weweb build name=jpui-input-file-grid type=wwobject
```

The CLI matches bare `name=` / `type=` arguments. Passing them as `--name=` (or through
`npm run build --name=...`) prints `arg 'name="name"' not specified` **and still exits 0**,
so a build that never ran can look like it succeeded.

## Checks

```bash
npm run check
```

Verifies the contracts nothing else enforces: that every state selector in `ww-config.js`
references a class name that still exists in `wwElement.vue`, and that `AI.json` mirrors
the config's states and the package name.

## Features

### Customizable Dropzone

The upload area uses a `wwLayout` dropzone, so you can drag and drop any WeWeb elements (text, icons, images, buttons) inside it to fully customize the look and feel.

### Reordering

With **Allow reorder** on, files can be reordered by dragging them, or with ctrl/cmd +
arrow keys when a file is focused. Reordering spans the whole list: a newly uploaded file
can be moved in front of one that came from the initial value.

While dragging, a line is drawn in the gap the file will be inserted into — which side of
the hovered file it lands on follows the pointer. Its colour is set by **Reorder line** in
the _File items_ style group, which only appears when Allow reorder is on.

### Validation

Built-in validation for file size (min/max), total size, file count, and file type. Accepted types include image, video, audio, PDF, CSV, Excel, Word, JSON, or custom extensions.

### Data Encoding

Optionally expose uploaded files as **Base64** or **Binary** data via toggle settings.

## Properties

| Property            | Type               | Default | Description                                                                   |
| ------------------- | ------------------ | ------- | ----------------------------------------------------------------------------- |
| Initial value       | `Array` (bindable) | `[]`    | Existing items: objects with a `url`/`src`, or bare URL strings               |
| Allow drag & drop   | `OnOff`            | `true`  | Enable/disable drag and drop                                                  |
| Allow reorder       | `OnOff`            | `false` | Let users reorder files by drag or ctrl/cmd + arrow keys                      |
| Max file size (MB)  | `Number`           | `10`    | Maximum size per file                                                         |
| Min file size (MB)  | `Number`           | `0`     | Minimum size per file                                                         |
| Max total size (MB) | `Number`           | `50`    | Maximum combined size across all files                                        |
| Max number of files | `Number`           | `10`    | File count limit. Set to 1 for single-file behaviour                          |
| Required            | `OnOff`            | `false` | Mark as required                                                              |
| Read only           | `OnOff`            | `false` | Prevent uploads                                                               |
| Allowed file types  | `TextSelect`       | `any`   | Filter by type: any, image, video, audio, pdf, csv, excel, word, json, custom |
| Custom extensions   | `Text`             | `""`    | Comma-separated extensions when type is `custom` (e.g. `.html, .xml`)         |
| Expose as Base64    | `OnOff`            | `false` | Include base64 string on each file                                            |
| Expose as Binary    | `OnOff`            | `false` | Include binary data on each file                                              |

## File Item Button

The remove button on each file item is styled through the **File item button** group in the style panel:

| Property        | Type                    | Default               | Description                                                                 |
| --------------- | ----------------------- | --------------------- | --------------------------------------------------------------------------- |
| Visibility      | `TextSelect` (bindable) | `always`              | `always` (always visible) or `hover` (revealed on file item hover or focus) |
| Remove icon     | `SystemIcon`            | `lucide/x`            | Icon displayed inside the button                                            |
| Button size     | `Length`                | `18px`                | Width and height of the button                                              |
| Icon size (%)   | `Number`                | `60`                  | Icon size relative to the button                                            |
| Icon color      | `Color`                 | `#ffffff`             | Icon color                                                                  |
| Icon background | `Color`                 | `rgba(0, 0, 0, 0.45)` | Button background                                                           |
| Button radius   | `Spacing`               | `50%`                 | Button border radius                                                        |
| Button border   | `Border`                | `none`                | Button border                                                               |
| Button shadow   | `Shadows`               | `none`                | Button box-shadow                                                           |
| Focus outline   | `Border`                | `2px solid #007aff`   | Outline shown on keyboard focus                                             |

When Visibility is set to `hover`, the button stays reachable by keyboard (it appears on `:focus-visible`), and selecting the `file-items-icon-hover` state in the editor keeps it visible on the canvas so it can still be styled.

**The `file-items-icon-hover` state applies to every file item at once.** WeWeb scopes a
state's generated CSS to the component's root element, and all the remove buttons inherit
from that one root — so hovering a single button restyles all of them. This is a property
of element-level states, not something the component can work around: per-item hover would
require each file item to be its own WeWeb element.

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
  allFiles: [],       // Authoritative, ordered list — read this for the user's order
  existingFiles: [],  // View over allFiles: items that came from initialValue
  newFiles: [],       // View over allFiles: files added during this session
  deletedFiles: []    // Items from initialValue that were removed
}
```

`allFiles` is the source of truth. `existingFiles` and `newFiles` are views over it,
filtered on each file's `isNew` flag, so `isNew` records **where a file came from**, not
where it sits. That is what lets a newly uploaded file be dragged in front of an existing
one without changing what it is.

Every file carries a stable `id` — synthesised for `initialValue` items that arrive
without one — which is what you should key on when persisting the new order.

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

| Event        | Description                                       | Payload                                                          |
| ------------ | ------------------------------------------------- | ---------------------------------------------------------------- |
| `On change`  | Fires when files are added, removed, or reordered | `{ value: { existingFiles, newFiles, deletedFiles, allFiles } }` |
| `On reorder` | Fires when a file is moved to a new position      | `{ value, fromIndex, toIndex, file }`                            |
| `On error`   | Fires on validation errors                        | `{ code, message, data }`                                        |

## Component Actions

| Action        | Description                                              | Arguments                                |
| ------------- | -------------------------------------------------------- | ---------------------------------------- |
| Clear Files   | Remove all files and move existing files to deletedFiles | -                                        |
| Clear Error   | Reset the last error state                               | -                                        |
| Remove File   | Remove a file by its index in the combined list          | `index` (Number)                         |
| Reorder Files | Move a file from one position to another in `allFiles`   | `fromIndex` (Number), `toIndex` (Number) |

## States

All states are selector-based, so WeWeb applies them from the DOM — the component emits no `add-state` / `remove-state`.

| State                   | Description                                                   | Matched by                    |
| ----------------------- | ------------------------------------------------------------- | ----------------------------- |
| `dragging`              | A file is being dragged over the component                    | `data-ww-dragging` attribute  |
| `disabled`              | Component is disabled                                         | `data-ww-disabled` attribute  |
| `readonly`              | Component is in read-only mode                                | `data-ww-readonly` attribute  |
| `error`                 | The last upload attempt failed validation                     | `data-ww-error` attribute     |
| `focus`                 | A control inside the component has focus                      | `:focus-within`               |
| `focus-visible`         | A control inside the component has keyboard focus             | `:focus-visible`              |
| `add-button-hover`      | The add button is hovered                                     | `:has(.…__add:hover)`         |
| `file-items-icon-hover` | A file item remove button is hovered (applies to all at once) | `:has(.…__item-remove:hover)` |

## Form Integration

When placed inside a WeWeb form container, the component supports `fieldName`, `customValidation`, and `validation` properties for form-level validation.

## Changelog

8/21/2026 - 4.2.2: docs: spell out the expected initial value shape in the editor tooltips
8/21/2026 - 4.2.1: fix: accept bare URL strings in the initial value, and preview images whose URL has no file extension
8/21/2026 - 4.2.0: feat: add a Reorder line style property for the insertion indicator colour
8/21/2026 - 4.1.3: fix: dropping a reordered file on the insertion line cancelled the drop, because the gap between two items belongs to no item
8/21/2026 - 4.1.2: feat: show an insertion line in the gap the dragged file will drop into, instead of outlining the file it would displace
8/21/2026 - 4.1.1: fix: declare the reorder drag refs (ReferenceError on load) and return maxFiles to the template, which made the file picker always accept multiple files
8/21/2026 - 4.1.0: feat: reorder files by drag or keyboard across existing and new files; allFiles becomes the authoritative ordered list with stable per-file ids
8/21/2026 - 4.0.0: chore: rename the component to jpui-input-file-grid and point the repository at this fork
8/21/2026 - 3.7.0: feat: add error, focus and focus-visible states, and drop the two unused root modifier classes
8/21/2026 - 3.6.3: fix: mark the add button inert when disabled, remove the hidden file input from the tab order and the accessibility tree, and replace deprecated substr
8/21/2026 - 3.6.2: fix: give the form an initialValue so resetting a form restores the field, and declare the sidepanel-content event the editor helper emits
8/21/2026 - 3.6.1: fix: keep the root hit-testable while editing so the element stays selectable on the canvas when disabled, let the dragging state preview from the state picker, guard wwElementState access, and stop offering per-state values on the icon properties
8/21/2026 - 3.6.0: refactor: port the five component states from the legacy add-state/remove-state emit API to selector-based states, and move the state- and class-aware style properties to the ww-config css() hook
8/21/2026 - 3.5.0: feat: add border, shadow and visibility (always / on hover) props for the file item remove button, and split style props into a dedicated "File item button" group
5/31/2026 - 3.4.3: feat: add file-items-icon-hover state, remove removeIconColorHover and removeIconBackgroundHover props
5/31/2026 - 3.4.2: feat: add border prop to file items
5/31/2026 - 3.4.1: fix: change image position property to a select with CSS keyword values
5/31/2026 - 3.4.0: feat: add image fit, image position, and aspect ratio props for file items and add button
5/30/2026 - 3.3.1: fix: enhance image file validation to include URL checks
