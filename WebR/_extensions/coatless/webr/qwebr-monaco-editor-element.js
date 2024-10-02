// Global dictionary to store Monaco Editor instances
const qwebrEditorInstances = {};

// Function that builds and registers a Monaco Editor instance    
globalThis.qwebrCreateMonacoEditorInstance = function (
    initialCode, 
    qwebrCounter) {

  // Retrieve the previously created document elements
  let runButton = document.getElementById(`qwebr-button-run-${qwebrCounter}`);
  let editorDiv = document.getElementById(`qwebr-editor-${qwebrCounter}`);

  // Helper function to determine font size dynamically
  const getResponsiveFontSize = () => {
    const minFontSize = 12; // Set a minimum font size in px
    const vwFontSize = window.innerWidth * 0.00833; // Equivalent to 0.833vw
    return Math.max(minFontSize, vwFontSize); // Ensure the font size doesn't go below the minimum
  };

  // Load the Monaco Editor and create an instance
  let editor;
  require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(editorDiv, {
      value: initialCode,
      language: 'r',
      theme: 'vs-dark',
      automaticLayout: true,           // Works wonderfully with RevealJS
      scrollBeyondLastLine: false,
      minimap: {
        enabled: false
      },
      fontSize: getResponsiveFontSize(), // Dynamically set the font size
      renderLineHighlight: "none",     // Disable current line highlighting
      hideCursorInOverviewRuler: true  // Remove cursor indicator in the right-hand side scroll bar
    });

    // Function to update font size on window resize
    const updateFontSize = () => {
      const newFontSize = getResponsiveFontSize();
      editor.updateOptions({ fontSize: newFontSize });
    };

    // Add event listener to resize font dynamically on window resize
    window.addEventListener('resize', updateFontSize);

    // Store the official counter ID to be used in keyboard shortcuts
    editor.__qwebrCounter = qwebrCounter;

    // Store the official div container ID
    editor.__qwebrEditorId = `qwebr-editor-${qwebrCounter}`;

    // Store the initial code value
    editor.__qwebrinitialCode = initialCode;

    // Dynamically modify the height of the editor window if new lines are added.
    let ignoreEvent = false;
    const updateHeight = () => {
      const contentHeight = editor.getContentHeight();
      editorDiv.style.height = `${contentHeight}px`;
      try {
        ignoreEvent = true;
        // The key to resizing is this call
        editor.layout();
      } finally {
        ignoreEvent = false;
      }
    };

    // Helper function to check if selected text is empty
    function isEmptyCodeText(selectedCodeText) {
      return (selectedCodeText === null || selectedCodeText === undefined || selectedCodeText === "");
    }

    // Registry of keyboard shortcuts that should be re-added to each editor window when focus changes.
    const addWebRKeyboardShortCutCommands = () => {
      // Add a keydown event listener for Shift+Enter to run all code in cell
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        // Retrieve all text inside the editor
        qwebrExecuteCode(editor.getValue(), editor.__qwebrCounter);
      });

      // Add a keydown event listener for CMD/Ctrl+Enter to run selected code
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        const selectedText = editor.getModel().getValueInRange(editor.getSelection());
        if (isEmptyCodeText(selectedText)) {
          let currentPosition = editor.getPosition();
          let currentLine = editor.getModel().getLineContent(currentPosition.lineNumber);
          let newPosition = new monaco.Position(currentPosition.lineNumber + 1, 1);
          if (newPosition.lineNumber > editor.getModel().getLineCount()) {
            editor.executeEdits("addNewLine", [{
              range: new monaco.Range(newPosition.lineNumber, 1, newPosition.lineNumber, 1),
              text: "\n", 
              forceMoveMarkers: true,
            }]);
          }
          qwebrExecuteCode(currentLine, editor.__qwebrCounter, EvalTypes.Interactive);
          editor.setPosition(newPosition);
        } else {
          qwebrExecuteCode(selectedText, editor.__qwebrCounter, EvalTypes.Interactive);
        }
      });
    };

    // Register an on focus event handler for when a code cell is selected to update what keyboard shortcut commands should work.
    editor.onDidFocusEditorText(addWebRKeyboardShortCutCommands);

    // Register an on change event for when new code is added to the editor window
    editor.onDidContentSizeChange(updateHeight);

    // Manually re-update height to account for the content we inserted into the call
    updateHeight();

    // Store the editor instance in the global dictionary
    qwebrEditorInstances[editor.__qwebrCounter] = editor;
  });

  // Add a click event listener to the run button
  runButton.onclick = function () {
    qwebrExecuteCode(editor.getValue(), editor.__qwebrCounter, EvalTypes.Interactive);
  };
};
