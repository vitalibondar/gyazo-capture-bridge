# Keyboard Maestro Integration (Optional)

This folder contains an exported Keyboard Maestro macro:

- `Gyazo-Capture-Bridge__Capture-Selection-to-Gyazo-Note.kmmacros`

## What it does

- Copies selected text (`Cmd+C`)
- Sends it into `notes_capture_from_clipboard.sh`
- Creates and uploads a Gyazo note card

## Import and setup

1. Open Keyboard Maestro.
2. Import `Gyazo-Capture-Bridge__Capture-Selection-to-Gyazo-Note.kmmacros`.
3. In the macro, set variable `GCB_PROJECT_DIR` to your local project path.
   - Example: `/Users/<you>/gyazo-capture-bridge`
4. Set your own hotkey.
5. Run once to verify upload works.

## Notes

- The exported macro intentionally has no fixed hotkey.
- The path is a placeholder and must be changed after import.
- This integration is optional. Core scripts work without Keyboard Maestro.
