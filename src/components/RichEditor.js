import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import CharacterCount from '@tiptap/extension-character-count';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';

import styles from '@/styles/richEditor.module.css';

// Icons
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaStrikethrough,
  FaAlignLeft,
  FaAlignCenter,
  FaAlignRight,
  FaAlignJustify,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaCode,
  FaMinus,
  FaTable,
  FaLink,
  FaImage,
  FaSmile,
  FaUndo,
  FaRedo,
  FaPalette,
  FaHighlighter,
  FaCheckSquare,
} from 'react-icons/fa';
import { useI18n } from "@/i18n/I18nProvider";

// Custom Font Size Extension for Tiptap v3
const FontSize = Extension.create({
  name: 'fontSize',

  addOptions() {
    return {
      types: ['textStyle'],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              const fontSize = element.style.fontSize;
              if (!fontSize) return null;
              return fontSize.replace('px', '');
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (size) =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

// MenuBar Component
const MenuBar = ({ editor }) => {
  const { t } = useI18n();

  if (!editor) return null;

  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState('default');
  const [headingLevel, setHeadingLevel] = useState('');

  // Update state when editor selection changes
  useEffect(() => {
    if (!editor) return;

    const updateStates = () => {
      try {
        // Get current text style attributes
        const attrs = editor.getAttributes('textStyle');

        // Update font size
        if (attrs.fontSize) {
          setFontSize(attrs.fontSize);
        }

        // Update font family
        if (attrs.fontFamily) {
          setFontFamily(attrs.fontFamily);
        } else {
          setFontFamily('default');
        }

        // Update heading level
        let found = false;
        for (let i = 1; i <= 6; i++) {
          if (editor.isActive('heading', { level: i })) {
            setHeadingLevel(i.toString());
            found = true;
            break;
          }
        }
        if (!found) {
          setHeadingLevel('');
        }
      } catch (error) {
        console.warn('Error updating editor states:', error);
      }
    };

    // Update on selection change and transactions
    editor.on('selectionUpdate', updateStates);
    editor.on('transaction', updateStates);

    // Initial update
    updateStates();

    return () => {
      editor.off('selectionUpdate', updateStates);
      editor.off('transaction', updateStates);
    };
  }, [editor]);

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    setFontSize(size);
    try {
      editor.chain().focus().setFontSize(size).run();
    } catch (error) {
      console.warn('Error setting font size:', error);
    }
  };

  const handleFontFamilyChange = (e) => {
    const family = e.target.value;
    setFontFamily(family);
    try {
      if (family === 'default') {
        editor.chain().focus().unsetFontFamily().run();
      } else {
        editor.chain().focus().setFontFamily(family).run();
      }
    } catch (error) {
      console.warn('Error setting font family:', error);
    }
  };

  const handleHeadingChange = (e) => {
    const level = e.target.value;
    setHeadingLevel(level);
    try {
      if (level) {
        editor.chain().focus().toggleHeading({ level: parseInt(level) }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    } catch (error) {
      console.warn('Error setting heading:', error);
    }
  };

  const executeCommand = (command) => {
    try {
      command();
    } catch (error) {
      console.warn('Error executing command:', error);
    }
  };

  return (
    <div className={styles.menuBar}>
      <div className={styles.menuGroup}>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleBold().run())}
          className={`${styles.menuButton} ${editor.isActive('bold') ? styles.active : ''}`}
          title={t("Bold")}
        >
          <FaBold />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleItalic().run())}
          className={`${styles.menuButton} ${editor.isActive('italic') ? styles.active : ''}`}
          title={t("Italic")}
        >
          <FaItalic />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleUnderline().run())}
          className={`${styles.menuButton} ${editor.isActive('underline') ? styles.active : ''}`}
          title={t("Underline")}
        >
          <FaUnderline />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleStrike().run())}
          className={`${styles.menuButton} ${editor.isActive('strike') ? styles.active : ''}`}
          title={t("Strike")}
        >
          <FaStrikethrough />
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <select
          className={styles.menuSelect}
          value={fontFamily}
          onChange={handleFontFamilyChange}
        >
          <option value="default">{t("Font")}</option>
          <option value="Arial">{t("Arial")}</option>
          <option value="Georgia">{t("Georgia")}</option>
          <option value="Times New Roman">{t("Times New Roman")}</option>
          <option value="Courier New">{t("Courier New")}</option>
        </select>

        <select className={styles.menuSelect} value={fontSize} onChange={handleFontSizeChange}>
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="20">20</option>
          <option value="24">24</option>
          <option value="28">28</option>
          <option value="36">36</option>
          <option value="48">48</option>
        </select>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          onClick={() => {
            try {
              const color = prompt(t("Enter color (hex, rgb, or name):"), '#ffd700');
              if (color) {
                editor.chain().focus().setColor(color).run();
              }
            } catch (error) {
              console.warn('Error setting color:', error);
            }
          }}
          className={styles.menuButton}
          title={t("Text Color")}
        >
          <FaPalette />
        </button>
        <button
          onClick={() => {
            try {
              const color = prompt(t("Enter highlight color (hex, rgb, or name):"), '#ffd700');
              if (color) {
                editor.chain().focus().toggleHighlight({ color }).run();
              }
            } catch (error) {
              console.warn('Error setting highlight:', error);
            }
          }}
          className={`${styles.menuButton} ${editor.isActive('highlight') ? styles.active : ''}`}
          title={t("Highlight")}
        >
          <FaHighlighter />
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <select className={styles.menuSelect} value={headingLevel} onChange={handleHeadingChange}>
          <option value="">{t("Heading")}</option>
          <option value="1">{t("H1")}</option>
          <option value="2">{t("H2")}</option>
          <option value="3">{t("H3")}</option>
          <option value="4">{t("H4")}</option>
          <option value="5">{t("H5")}</option>
          <option value="6">{t("H6")}</option>
        </select>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign('left').run())}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: 'left' }) ? styles.active : ''}`}
          title={t("Align Left")}
        >
          <FaAlignLeft />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign('center').run())}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: 'center' }) ? styles.active : ''}`}
          title={t("Align Center")}
        >
          <FaAlignCenter />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign('right').run())}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: 'right' }) ? styles.active : ''}`}
          title={t("Align Right")}
        >
          <FaAlignRight />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setTextAlign('justify').run())}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: 'justify' }) ? styles.active : ''}`}
          title={t("Justify")}
        >
          <FaAlignJustify />
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleBulletList().run())}
          className={`${styles.menuButton} ${editor.isActive('bulletList') ? styles.active : ''}`}
          title={t("Bullet List")}
        >
          <FaListUl />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleOrderedList().run())}
          className={`${styles.menuButton} ${editor.isActive('orderedList') ? styles.active : ''}`}
          title={t("Numbered List")}
        >
          <FaListOl />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleTaskList().run())}
          className={`${styles.menuButton} ${editor.isActive('taskList') ? styles.active : ''}`}
          title={t("Checklist")}
        >
          <FaCheckSquare />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleBlockquote().run())}
          className={`${styles.menuButton} ${editor.isActive('blockquote') ? styles.active : ''}`}
          title={t("Quote")}
        >
          <FaQuoteRight />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().toggleCodeBlock().run())}
          className={`${styles.menuButton} ${editor.isActive('codeBlock') ? styles.active : ''}`}
          title={t("Code Block")}
        >
          <FaCode />
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().setHorizontalRule().run())}
          className={styles.menuButton}
          title={t("Horizontal Line")}
        >
          <FaMinus />
        </button>
        <button
          onClick={() => {
            try {
              const url = prompt(t("Enter URL:"));
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              }
            } catch (error) {
              console.warn('Error setting link:', error);
            }
          }}
          className={`${styles.menuButton} ${editor.isActive('link') ? styles.active : ''}`}
          title={t("Hyperlink")}
        >
          <FaLink />
        </button>
        <button
          onClick={() => {
            try {
              const url = prompt(t("Enter image URL:"));
              if (url) {
                editor.chain().focus().setImage({ src: url }).run();
              }
            } catch (error) {
              console.warn('Error inserting image:', error);
            }
          }}
          className={styles.menuButton}
          title={t("Image")}
        >
          <FaImage />
        </button>
        <button
          onClick={() => {
            try {
              const emoji = prompt(t("Enter emoji:"));
              if (emoji) {
                editor.commands.insertContent(emoji);
              }
            } catch (error) {
              console.warn('Error inserting emoji:', error);
            }
          }}
          className={styles.menuButton}
          title={t("Emoji")}
        >
          <FaSmile />
        </button>
        <button
          onClick={() =>
            executeCommand(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())
          }
          className={styles.menuButton}
          title={t("Table")}
        >
          <FaTable />
        </button>
      </div>

      <div className={styles.menuDivider} />

      <div className={styles.menuGroup}>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().undo().run())}
          className={styles.menuButton}
          title={t("Undo")}
        >
          <FaUndo />
        </button>
        <button
          onClick={() => executeCommand(() => editor.chain().focus().redo().run())}
          className={styles.menuButton}
          title={t("Redo")}
        >
          <FaRedo />
        </button>
      </div>
    </div>
  );
};

// Main RichEditor Component
const RichEditor = forwardRef(({ content, onChange, className = '' }, ref) => {
  const { t } = useI18n();

  const [charCount, setCharCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const contentRef = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // History is included in StarterKit, we keep it
      }),
      Placeholder.configure({
        placeholder: 'Start writing your story...',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'tiptap-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      FontSize,
      CharacterCount.configure({
        limit: 50000,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      try {
        const html = editor.getHTML();
        const text = editor.getText();
        const words = text.split(/\s+/).filter((w) => w.length > 0).length;
        const chars = text.length;

        setCharCount(chars);
        setWordCount(words);

        if (onChange) {
          onChange(html);
        }
      } catch (error) {
        console.warn('Error in onUpdate:', error);
      }
    },
    editorProps: {
      attributes: {
        class: styles.editorContent,
      },
    },
  });

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getEditor: () => editor,
    getContent: () => editor?.getHTML() || '',
    getWordCount: () => wordCount,
    getCharCount: () => charCount,
    setContent: (newContent) => {
      if (editor && isMounted) {
        try {
          editor.commands.setContent(newContent || '');
          contentRef.current = newContent;
        } catch (error) {
          console.warn('Error setting content:', error);
        }
      }
    },
    focus: () => {
      if (editor && isMounted) {
        try {
          editor.commands.focus();
        } catch (error) {
          console.warn('Error focusing editor:', error);
        }
      }
    },
    getSelection: () => {
      return editor?.state.selection;
    },
    setSelection: (from, to) => {
      if (editor && isMounted) {
        try {
          editor.commands.setTextSelection({ from, to });
        } catch (error) {
          console.warn('Error setting selection:', error);
        }
      }
    },
  }));

  // Update content when prop changes
  useEffect(() => {
    if (editor && isMounted && content !== contentRef.current && content !== editor.getHTML()) {
      try {
        editor.commands.setContent(content || '');
        contentRef.current = content;
      } catch (error) {
        console.warn('Error updating content:', error);
      }
    }
  }, [content, editor, isMounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        editor?.destroy();
      } catch (error) {
        console.warn('Error destroying editor:', error);
      }
    };
  }, [editor]);

  // Don't render on server
  if (typeof window === 'undefined' || !isMounted) {
    return <div className={styles.loading}>{t("Loading editor...")}</div>;
  }

  return (
    <div className={`${styles.editorWrapper} ${className}`}>
      <div className={styles.toolbarWrapper}>
        <MenuBar editor={editor} />
      </div>

      <EditorContent editor={editor} className={styles.editorContainer} />

      <div className={styles.editorFooter}>
        <div className={styles.counts}>
          <span>{t("{wordCount} words", { wordCount })}</span>
          <span>•</span>
          <span>{t("{charCount} characters", { charCount })}</span>
          {charCount >= 45000 && (
            <span className={styles.limitWarning}>• {50000 - charCount}{" "}{t("characters remaining")}</span>
          )}
        </div>
        <div className={styles.readingTime}>{readingTime(editor?.getText() || '')}</div>
      </div>
    </div>
  );
});

// Reading time calculation
const readingTime = (text) => {
  try {
    const words = text.split(/\s+/).filter((w) => w.length > 0).length || 0;
    const minutes = Math.ceil(words / 200);
    if (minutes < 1) return '< 1 min read';
    if (minutes === 1) return '1 min read';
    return `${minutes} min read`;
  } catch (error) {
    return '1 min read';
  }
};

RichEditor.displayName = 'RichEditor';

export default RichEditor;
