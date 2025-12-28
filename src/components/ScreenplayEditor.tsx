import React, { useMemo, useState, forwardRef, useImperativeHandle, useCallback } from 'react'
import { createEditor, Editor, Transforms, Element as SlateElement, Range } from 'slate'
import type { BaseEditor, Descendant } from 'slate'
import { Slate, Editable, withReact, useSlateStatic, ReactEditor } from 'slate-react'
import { withHistory } from 'slate-history'

declare module 'slate' {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor
    Element: CustomElement
    Text: CustomText
  }
}

type CustomEditor = BaseEditor & ReactEditor

type CustomElement = {
  type: 'paragraph' | 'scene-heading' | 'action' | 'character' | 'dialogue' | 'parenthetical' | 'transition'
  children: CustomText[]
}

type CustomText = {
  text: string
}

interface ScreenplayEditorProps {
  initialValue?: Descendant[]
  onTitleChange?: (title: string) => void
}

interface CommandPaletteProps {
  isOpen: boolean
  onSelect: (command: string) => void
  onClose: () => void
}

// Command palette component
const CommandPalette: React.FC<CommandPaletteProps & { position?: { top: number; left: number } }> = ({
  isOpen,
  onSelect,
  onClose,
  position = { top: 100, left: 100 }
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const commands = [
    { id: 'scene', label: 'Scene Heading', shortcut: '/scene', icon: '🎬' },
    { id: 'action', label: 'Action', shortcut: '/action', icon: '📝' },
    { id: 'character', label: 'Character', shortcut: '/character', icon: '👤' },
    { id: 'dialogue', label: 'Dialogue', shortcut: '/dialogue', icon: '💬' },
    { id: 'parenthetical', label: 'Parenthetical', shortcut: '/parens', icon: '📌' },
    { id: 'transition', label: 'Transition', shortcut: '/transition', icon: '➡️' },
    { id: 'shot', label: 'Shot', shortcut: '/shot', icon: '📷' },
    { id: 'text', label: 'Text', shortcut: '/text', icon: '📄' },
    { id: 'note', label: 'Note', shortcut: '/note', icon: '📝' },
    { id: 'outline', label: 'Outline', shortcut: '/outline', icon: '📋' },
    { id: 'newact', label: 'New Act', shortcut: '/newact', icon: '🎭' },
    { id: 'endact', label: 'End Act', shortcut: '/endact', icon: '🏁' },
    { id: 'lyrics', label: 'Lyrics', shortcut: '/lyrics', icon: '🎵' },
    { id: 'image', label: 'Image', shortcut: '/image', icon: '🖼️' },
    { id: 'sequence', label: 'Sequence', shortcut: '/sequence', icon: '🎬' },
    { id: 'dual', label: 'Dual Dialogue', shortcut: '/dual', icon: '👥' }
  ]

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(0)
    }
  }, [isOpen])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % commands.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + commands.length) % commands.length)
          break
        case 'Enter':
          e.preventDefault()
          onSelect(commands[selectedIndex].id)
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, onSelect, onClose])

  if (!isOpen) return null

  return (
    <div
      className="command-palette"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000
      }}
    >
      <div className="command-palette-header">
        <span className="command-palette-title">Insert Element</span>
        <span className="command-palette-subtitle">Choose an element to insert</span>
      </div>
      <div className="command-palette-list">
        {commands.map((command, index) => (
          <div
            key={command.id}
            className={`command-palette-item ${index === selectedIndex ? 'selected' : ''}`}
            onClick={() => onSelect(command.id)}
          >
            <span className="command-icon">{command.icon}</span>
            <span className="command-label">{command.label}</span>
            <span className="command-shortcut">{command.shortcut}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const initialValue: Descendant[] = [
  {
    type: 'action',
    children: [{ text: 'FADE IN:' }],
  },
  {
    type: 'scene-heading',
    children: [{ text: 'INT. EXAMPLE ROOM - DAY' }],
  },
  {
    type: 'action',
    children: [{ text: 'A writer sits at a desk, typing furiously on a laptop.' }],
  },
  {
    type: 'character',
    children: [{ text: 'WRITER' }],
  },
  {
    type: 'dialogue',
    children: [{ text: 'This screenplay editor is amazing!' }],
  },
  {
    type: 'transition',
    children: [{ text: 'FADE OUT.' }],
  },
]

// Helper functions
const isBlockActive = (editor: CustomEditor, format: string) => {
  const [match] = Editor.nodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && (n as CustomElement).type === format,
  })
  return !!match
}

const toggleBlock = (editor: CustomEditor, format: string) => {
  const isActive = isBlockActive(editor, format)
  const isList = ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'].includes(format)

  Transforms.unwrapNodes(editor, {
    match: n => !Editor.isEditor(n) && SlateElement.isElement(n) && ['scene-heading', 'action', 'character', 'dialogue', 'parenthetical', 'transition'].includes((n as CustomElement).type),
    split: true,
  })

  Transforms.setNodes(editor, {
    type: isActive ? 'paragraph' : isList ? format : 'paragraph',
  } as Partial<CustomElement>)

  if (!isActive && isList) {
    const block = { type: format, children: [] } as CustomElement
    Transforms.wrapNodes(editor, block)
  }
}

const insertElement = (editor: CustomEditor, type: string) => {
  const element = { type, children: [{ text: '' }] } as CustomElement
  Transforms.insertNodes(editor, element)
  Transforms.move(editor)
}

// Toolbar component
const Toolbar = () => {
  const editor = useSlateStatic()

  return (
    <div className="editor-toolbar">
      <button
        className={`toolbar-btn ${isBlockActive(editor, 'scene-heading') ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault()
          toggleBlock(editor, 'scene-heading')
        }}
      >
        Scene
      </button>
      <button
        className={`toolbar-btn ${isBlockActive(editor, 'action') ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault()
          toggleBlock(editor, 'action')
        }}
      >
        Action
      </button>
      <button
        className={`toolbar-btn ${isBlockActive(editor, 'character') ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault()
          toggleBlock(editor, 'character')
        }}
      >
        Character
      </button>
      <button
        className={`toolbar-btn ${isBlockActive(editor, 'dialogue') ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault()
          toggleBlock(editor, 'dialogue')
        }}
      >
        Dialogue
      </button>
      <button
        className={`toolbar-btn ${isBlockActive(editor, 'parenthetical') ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault()
          toggleBlock(editor, 'parenthetical')
        }}
      >
        Parenthetical
      </button>
      <button
        className={`toolbar-btn ${isBlockActive(editor, 'transition') ? 'active' : ''}`}
        onMouseDown={e => {
          e.preventDefault()
          toggleBlock(editor, 'transition')
        }}
      >
        Transition
      </button>
    </div>
  )
}

const renderElement = (props: any) => {
  const { attributes, children, element } = props
  switch (element.type) {
    case 'scene-heading':
      return (
        <div {...attributes} className="scene-heading">
          {children}
        </div>
      )
    case 'action':
      return (
        <div {...attributes} className="action">
          {children}
        </div>
      )
    case 'character':
      return (
        <div {...attributes} className="character">
          {children}
        </div>
      )
    case 'dialogue':
      return (
        <div {...attributes} className="dialogue">
          {children}
        </div>
      )
    case 'parenthetical':
      return (
        <div {...attributes} className="parenthetical">
          {children}
        </div>
      )
    case 'transition':
      return (
        <div {...attributes} className="transition">
          {children}
        </div>
      )
    default:
      return <div {...attributes} className="action">{children}</div>
  }
}

// Auto-formatting patterns
const autoFormatPatterns = [
  { pattern: /^INT\.?\s/i, type: 'scene-heading' },
  { pattern: /^EXT\.?\s/i, type: 'scene-heading' },
  { pattern: /^FADE\s/i, type: 'transition' },
  { pattern: /^CUT\s/i, type: 'transition' },
  { pattern: /^DISSOLVE\s/i, type: 'transition' },
]

const withAutoFormatting = (editor: CustomEditor) => {
  const { insertText, deleteBackward, deleteForward, insertData } = editor

  // Custom paste handler to preserve Unicode text
  editor.insertData = (data: DataTransfer) => {
    const text = data.getData('text/plain')
    if (text) {
      console.log('Pasting text:', text)
      console.log('Text length:', text.length)
      console.log('First few chars:', text.substring(0, 10))
      // For Unicode text, insert the entire text at once to preserve encoding
      Transforms.insertText(editor, text)
      return
    }
    // Fallback to default behavior for other data types
    insertData(data)
  }

  editor.insertText = (text) => {
    // Only apply auto-formatting for actual text insertion (not control characters)
    const isActualText = text && text.length === 1 && text !== '\n' && text !== '\t'
    insertText(text)

    // Check for auto-formatting after inserting actual text
    if (isActualText) {
      const { selection } = editor
      if (selection && Range.isCollapsed(selection)) {
        const [node] = Editor.node(editor, selection)
        if ('text' in node) {
          const textContent = node.text
          for (const { pattern, type } of autoFormatPatterns) {
            if (pattern.test(textContent)) {
              // Get the current element
              const [element] = Editor.above(editor, {
                match: n => !Editor.isEditor(n) && SlateElement.isElement(n),
              }) || []

              if (element && (element as CustomElement).type !== type) {
                Transforms.setNodes(editor, { type } as Partial<CustomElement>)
                break
              }
            }
          }
        }
      }
    }
  }

  // Ensure delete operations work normally
  editor.deleteBackward = (unit) => {
    deleteBackward(unit)
  }

  editor.deleteForward = (unit) => {
    deleteForward(unit)
  }

  return editor
}

const ScreenplayEditor = forwardRef<any, ScreenplayEditorProps>(({ initialValue: propInitialValue, onTitleChange }, ref) => {
  const editor = useMemo(() => withAutoFormatting(withHistory(withReact(createEditor()))) as CustomEditor, [])
  const [value, setValue] = useState<Descendant[]>(propInitialValue || initialValue)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [commandPalettePosition, setCommandPalettePosition] = useState({ top: 0, left: 0 })

  const handleCommandSelect = useCallback((command: string) => {
    // Remove the "/" character first
    Transforms.delete(editor, { distance: 1, reverse: true })

    // Insert the appropriate element based on command
    const elementMap: { [key: string]: string } = {
      'scene': 'scene-heading',
      'action': 'action',
      'character': 'character',
      'dialogue': 'dialogue',
      'parenthetical': 'parenthetical',
      'transition': 'transition',
      'shot': 'action', // Shot can be treated as action for now
      'text': 'action',
      'note': 'action',
      'outline': 'action',
      'newact': 'action',
      'endact': 'action',
      'lyrics': 'action',
      'image': 'action',
      'sequence': 'action',
      'dual': 'dialogue'
    }

    const elementType = elementMap[command] || 'action'
    const element = { type: elementType, children: [{ text: '' }] } as CustomElement
    Transforms.insertNodes(editor, element)
    Transforms.move(editor)

    setShowCommandPalette(false)
  }, [editor])

  const handleCommandClose = useCallback(() => {
    setShowCommandPalette(false)
    // Remove the "/" if palette is closed without selection
    if (showCommandPalette) {
      Transforms.delete(editor, { distance: 1, reverse: true })
    }
  }, [editor, showCommandPalette])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (showCommandPalette) {
      // Command palette handles its own key events
      return
    }

    if (event.key === '/') {
      // Show command palette
      const domSelection = window.getSelection()
      if (domSelection && domSelection.rangeCount > 0) {
        const range = domSelection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setCommandPalettePosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX
        })
      }
      setShowCommandPalette(true)
      return
    }

    if (event.key === 'Enter') {
      const { selection } = editor
      if (selection && Range.isCollapsed(selection)) {
        const [node] = Editor.above(editor, {
          match: n => !Editor.isEditor(n) && SlateElement.isElement(n),
        }) || []

        if (node) {
          const element = node as CustomElement
          event.preventDefault()

          if (element.type === 'character') {
            // After character, insert dialogue
            Transforms.insertNodes(editor, {
              type: 'dialogue',
              children: [{ text: '' }],
            } as CustomElement)
          } else if (element.type === 'scene-heading') {
            // After scene heading, insert action
            Transforms.insertNodes(editor, {
              type: 'action',
              children: [{ text: '' }],
            } as CustomElement)
          } else {
            // Default to action
            Transforms.insertNodes(editor, {
              type: 'action',
              children: [{ text: '' }],
            } as CustomElement)
          }
        }
      }
    } else if (event.key === 'Tab') {
      event.preventDefault()
      const { selection } = editor
      if (selection && Range.isCollapsed(selection)) {
        // Insert character element
        Transforms.insertNodes(editor, {
          type: 'character',
          children: [{ text: '' }],
        } as CustomElement)
      }
    } else if (event.key === 'Escape') {
      setShowCommandPalette(false)
    }
  }, [editor, showCommandPalette])

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    reset: () => setValue(initialValue),
  }))

  return (
    <div className="editor-container">
      <Slate editor={editor} initialValue={value} onChange={setValue}>
        <Toolbar />
        <Editable
          className="slate-editor"
          renderElement={renderElement}
          onKeyDown={handleKeyDown}
          spellCheck
          style={{ fontFamily: "'Courier New', Courier, 'Noto Sans Tamil', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}
        />
      </Slate>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onSelect={handleCommandSelect}
        onClose={handleCommandClose}
        position={commandPalettePosition}
      />
    </div>
  )
})

export default ScreenplayEditor
