import "./code-editor.css";
import "./syntax.css";

import { useRef } from "react";
import MonacoEditor, { EditorDidMount } from "@monaco-editor/react";
import prettier from "prettier";
import parser from "prettier/parser-babel";
import codeShift from "jscodeshift";
import Highlighter from "monaco-jsx-highlighter";

/* **
 Monaco Editor: https://www.npmjs.com/package/@monaco-editor/react
 The React component we're using is a wrapper around the real Monaco Editor.
 Configuration options:
 * editorDidMount: {
   * Signature: function(getEditorValue: func, editor: object) => void
   * This function will be called right after monaco editor will be mounted and ready to work.
   * It gets the editor instance as a second argument. Defaults to "noop"
 }
 * value: The editor value (initial value).
 * language: All languages that are supported by monaco-editor.
 * theme: Default themes of monaco. Defaults to "light".
 * options: IEditorConstructionOptions {
    * wordWrap: When `wordWrap` = "on", the lines will wrap at the viewport width.
    * minimap: Control the behavior and rendering of the minimap.
    * showUnused: Controls fading out of unused variables.
    * folding: Enable code folding.
    * lineNumbersMinChars: Control the width of line numbers, by reserving horizontal space for rendering at least an amount of digits.
    * scrollBeyondLastLine: Enable that scrolling can go one screen size after the last line.
    * automaticLayout: Enable that the editor will install an interval to check if its container dom node size has changed.
  }
*/

interface CodeEditorProps {
  initialValue: string;
  onChange(value: string): void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onChange, initialValue }) => {
  const editorRef = useRef<any>();

  //  *** update editor content with code highlighting
  const onEditorDidMount: EditorDidMount = (getValue, monacoEditor) => {
    editorRef.current = monacoEditor;
    monacoEditor.onDidChangeModelContent(() => {
      onChange(getValue());
    });

    monacoEditor.getModel()?.updateOptions({ tabSize: 2 });

    const highlighter = new Highlighter(
      // @ts-ignore
      window.monaco,
      codeShift,
      monacoEditor
    );
    highlighter.highLightOnDidChangeModelContent(
      // bug fixed: avoid to log out err in console while user is typing unfinished code
      () => {},
      () => {},
      undefined,
      () => {}
    );
  };

  //  *** format code with Prettier
  const onFormatClick = () => {
    const unformatted = editorRef.current.getModel().getValue();
    const formatted = prettier
      .format(unformatted, {
        parser: "babel",
        plugins: [parser],
        useTabs: false,
        semi: true,
        singleQuote: true,
      })
      .replace(/\n$/, ""); // remove new line

    editorRef.current.setValue(formatted);
  };

  return (
    <div className="editor-wrapper">
      <button
        className="button button-format is-primary is-small"
        onClick={onFormatClick}
      >
        Format
      </button>
      <MonacoEditor
        editorDidMount={onEditorDidMount}
        value={initialValue}
        theme="dark"
        language="javascript"
        height="100%"
        options={{
          wordWrap: "on",
          minimap: { enabled: false },
          showUnused: false,
          folding: false,
          lineNumbersMinChars: 3,
          fontSize: 16,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
