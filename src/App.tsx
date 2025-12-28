import React, { useRef, useState, useEffect } from 'react'
import ScreenplayEditor from './components/ScreenplayEditor'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { screenplayService } from './lib/api'
import './App.css'

interface SceneInfo {
  number: number
  heading: string
  page: number
}

interface TitlePage {
  title: string
  author: string
  contact: string
  basedOn: string
}

function App() {
  const editorRef = useRef<any>(null)
  const [initialContent, setInitialContent] = useState<any>(null)
  const [currentDocument, setCurrentDocument] = useState<string>('Untitled Screenplay')
  const [titlePage, setTitlePage] = useState<TitlePage>({
    title: '',
    author: '',
    contact: '',
    basedOn: ''
  })
  const [showTitlePage, setShowTitlePage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadScreenplay = async () => {
      try {
        // First try to load from Supabase
        const screenplays = await screenplayService.getScreenplays()
        if (screenplays.length > 0) {
          const latest = screenplays[0] // Get the most recently updated
          setInitialContent(latest.content)
          setTitlePage(latest.title_page)
          setCurrentDocument(latest.title)
        } else {
          // Fallback to localStorage if no data in Supabase
          const saved = localStorage.getItem('screenplay-content')
          const savedTitlePage = localStorage.getItem('screenplay-title-page')
          const savedTitle = localStorage.getItem('screenplay-title')

          if (saved) {
            try {
              setInitialContent(JSON.parse(saved))
            } catch (error) {
              console.error('Error loading saved content:', error)
            }
          }

          if (savedTitlePage) {
            try {
              setTitlePage(JSON.parse(savedTitlePage))
            } catch (error) {
              console.error('Error loading title page:', error)
            }
          }

          if (savedTitle) {
            setCurrentDocument(savedTitle)
          }
        }
      } catch (error) {
        console.error('Error loading from database:', error)
        // Fallback to localStorage
        const saved = localStorage.getItem('screenplay-content')
        const savedTitlePage = localStorage.getItem('screenplay-title-page')
        const savedTitle = localStorage.getItem('screenplay-title')

        if (saved) {
          try {
            setInitialContent(JSON.parse(saved))
          } catch (error) {
            console.error('Error loading saved content:', error)
          }
        }

        if (savedTitlePage) {
          try {
            setTitlePage(JSON.parse(savedTitlePage))
          } catch (error) {
            console.error('Error loading title page:', error)
          }
        }

        if (savedTitle) {
          setCurrentDocument(savedTitle)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadScreenplay()
  }, [])

  const handleSave = async () => {
    if (editorRef.current && !isSaving) {
      setIsSaving(true)
      const content = editorRef.current.getValue()
      try {
        console.log('Saving content to database:', content)
        await screenplayService.saveCurrentScreenplay(currentDocument, content, titlePage)

        // Also save to localStorage as backup
        localStorage.setItem('screenplay-content', JSON.stringify(content))
        localStorage.setItem('screenplay-title-page', JSON.stringify(titlePage))
        localStorage.setItem('screenplay-title', currentDocument)

        alert('Saved successfully!')
      } catch (error) {
        console.error('Error saving to database:', error)
        // Fallback to localStorage
        try {
          localStorage.setItem('screenplay-content', JSON.stringify(content))
          localStorage.setItem('screenplay-title-page', JSON.stringify(titlePage))
          localStorage.setItem('screenplay-title', currentDocument)
          alert('Saved to local storage (database unavailable)')
        } catch (localError) {
          console.error('Error saving to localStorage:', localError)
          alert('Failed to save!')
        }
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleNewDocument = () => {
    if (confirm('Create new document? Unsaved changes will be lost.')) {
      setInitialContent(null)
      setTitlePage({ title: '', author: '', contact: '', basedOn: '' })
      setCurrentDocument('Untitled Screenplay')
      if (editorRef.current) {
        editorRef.current.reset()
      }
    }
  }

  const handleExportPDF = async () => {
    if (!editorRef.current) return

    try {
      console.log('Starting PDF export...')
      const pdfDoc = await PDFDocument.create()
      console.log('PDF document created')

      // Use Helvetica for better Unicode support (including Tamil and Hindi)
      const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const courierFont = await pdfDoc.embedFont(StandardFonts.Courier) // fallback for formatting
      const courierBoldFont = await pdfDoc.embedFont(StandardFonts.CourierBold) // fallback for formatting
      console.log('Fonts loaded')

      const pageWidth = 612 // 8.5 inches at 72 DPI
      const pageHeight = 792 // 11 inches at 72 DPI
      const marginLeft = 72 // 1 inch
      const marginRight = 72
      const marginTop = 72
      const marginBottom = 72

      // Get content from editor
      const content = editorRef.current.getValue()
      console.log('Editor content:', content)

      // Title Page
      if (showTitlePage && (titlePage.title || titlePage.author)) {
        const titlePagePdf = pdfDoc.addPage([pageWidth, pageHeight])
        const { height } = titlePagePdf.getSize()

        if (titlePage.title) {
          const titleWidth = courierBoldFont.widthOfTextAtSize(titlePage.title.toUpperCase(), 24)
          titlePagePdf.drawText(titlePage.title.toUpperCase(), {
            x: (pageWidth - titleWidth) / 2,
            y: height - 200,
            size: 24,
            font: courierBoldFont,
            color: rgb(0, 0, 0),
          })
        }

        if (titlePage.author) {
          const authorWidth = courierFont.widthOfTextAtSize(`Written by ${titlePage.author}`, 12)
          titlePagePdf.drawText(`Written by ${titlePage.author}`, {
            x: (pageWidth - authorWidth) / 2,
            y: height - 300,
            size: 12,
            font: courierFont,
            color: rgb(0, 0, 0),
          })
        }

        if (titlePage.basedOn) {
          const basedOnWidth = courierFont.widthOfTextAtSize(`Based on "${titlePage.basedOn}"`, 12)
          titlePagePdf.drawText(`Based on "${titlePage.basedOn}"`, {
            x: (pageWidth - basedOnWidth) / 2,
            y: height - 350,
            size: 12,
            font: courierFont,
            color: rgb(0, 0, 0),
          })
        }

        if (titlePage.contact) {
          titlePagePdf.drawText(titlePage.contact, {
            x: marginLeft,
            y: marginBottom,
            size: 10,
            font: courierFont,
            color: rgb(0, 0, 0),
          })
        }
      }

      // Content Pages
      const formattedContent = formatContentForPDF(content)

      let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
      let yPosition = pageHeight - marginTop
      const lineHeight = 14
      const maxLinesPerPage = Math.floor((pageHeight - marginTop - marginBottom) / lineHeight)

      for (const line of formattedContent) {
        if (yPosition - lineHeight < marginBottom) {
          currentPage = pdfDoc.addPage([pageWidth, pageHeight])
          yPosition = pageHeight - marginTop
        }

        const font = line.bold ? courierBoldFont : courierFont
        const fontSize = line.size || 12
        const xPosition = line.type === 'scene-heading' ? (pageWidth - font.widthOfTextAtSize(line.text.toUpperCase(), fontSize)) / 2 :
                      line.type === 'character' ? marginLeft + 144 : // 2 inches
                      line.type === 'dialogue' ? marginLeft + 108 : // 1.5 inches
                      line.type === 'parenthetical' ? marginLeft + 144 : // 2 inches
                      line.type === 'transition' ? pageWidth - marginRight - font.widthOfTextAtSize(line.text.toUpperCase(), fontSize) :
                      marginLeft + 108 // action default

        currentPage.drawText(line.text, {
          x: xPosition,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        })

        yPosition -= lineHeight
      }

      console.log('Saving PDF...')
      const pdfBytes = await pdfDoc.save()
      console.log('PDF bytes length:', pdfBytes.length)

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      console.log('Blob created, size:', blob.size)

      const url = URL.createObjectURL(blob)
      console.log('Blob URL created:', url)

      const a = document.createElement('a')
      a.href = url
      a.download = `${currentDocument.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
      console.log('Download filename:', a.download)

      a.click()
      console.log('Download triggered')

      URL.revokeObjectURL(url)
      console.log('PDF export completed successfully')
    } catch (error) {
      console.error('PDF export error:', error)
      alert('Failed to export PDF')
    }
  }

  const formatContentForPDF = (nodes: any[]): any[] => {
    console.log('formatContentForPDF input:', nodes)
    const result: any[] = []

    const processNode = (node: any, indentLevel = 0) => {
      console.log('Processing node:', node)

      // If this is a text node (leaf node)
      if (node.text !== undefined) {
        const lines = node.text.split('\n')
        lines.forEach((line: string) => {
          if (line.trim()) {
            result.push({
              text: line,
              type: node.type || 'action',
              bold: node.type === 'character' || node.type === 'scene-heading' || node.type === 'transition',
              size: node.type === 'scene-heading' ? 12 : 12
            })
          }
        })
      }

      // If this node has children, process them
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach((child: any) => processNode({ ...child, type: node.type || child.type }, indentLevel))
      }
    }

    if (nodes && Array.isArray(nodes)) {
      nodes.forEach(node => processNode(node))
    }

    console.log('formatContentForPDF result:', result)
    return result
  }

  // Extract scenes from content for navigator
  const extractScenes = (content: any[]): SceneInfo[] => {
    const scenes: SceneInfo[] = []
    let sceneNumber = 1
    let pageNumber = 1

    if (content) {
      content.forEach((node) => {
        if (node.type === 'scene-heading' && node.children && node.children[0]) {
          scenes.push({
            number: sceneNumber++,
            heading: node.children[0].text || 'Untitled Scene',
            page: pageNumber
          })
        }
      })
    }

    return scenes
  }

  const scenes = initialContent ? extractScenes(initialContent) : []

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-left">
          <h1>ScreenWrite-Bharat</h1>
          <span className="document-title">{currentDocument}</span>
        </div>
        <nav className="main-nav">
          {/* Navigation buttons moved to right sidebar */}
        </nav>
      </header>

      <div className="app-main">
        {/* Left Sidebar - 30% */}
        <aside className="app-sidebar left-sidebar">
          <div className="sidebar-section">
            <h3>Script Details</h3>
            <div className="script-info">
              <div className="info-item">
                <span className="info-label">Title:</span>
                <span className="info-value">{currentDocument}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Scenes:</span>
                <span className="info-value">{scenes.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Pages:</span>
                <span className="info-value">~{Math.ceil(scenes.length * 1.5)}</span>
              </div>
            </div>
          </div>

          {showTitlePage && (
            <div className="sidebar-section">
              <h3>Title Page</h3>
              <div className="title-form">
                <label>
                  Title:
                  <input
                    type="text"
                    value={titlePage.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setTitlePage({...titlePage, title: newTitle});
                      setCurrentDocument(newTitle || 'Untitled Screenplay');
                    }}
                    placeholder="Enter screenplay title"
                  />
                </label>
                <label>
                  Author:
                  <input
                    type="text"
                    value={titlePage.author}
                    onChange={(e) => setTitlePage({...titlePage, author: e.target.value})}
                    placeholder="Written by..."
                  />
                </label>
                <label>
                  Based On:
                  <input
                    type="text"
                    value={titlePage.basedOn}
                    onChange={(e) => setTitlePage({...titlePage, basedOn: e.target.value})}
                    placeholder="Based on (optional)"
                  />
                </label>
                <label>
                  Contact:
                  <input
                    type="text"
                    value={titlePage.contact}
                    onChange={(e) => setTitlePage({...titlePage, contact: e.target.value})}
                    placeholder="Contact information"
                  />
                </label>
              </div>
            </div>
          )}

          <div className="sidebar-section">
            <h3>Scene Navigator</h3>
            <div className="scene-list">
              {scenes.length > 0 ? (
                scenes.map((scene) => (
                  <div key={scene.number} className="scene-item">
                    <span className="scene-number">{scene.number}</span>
                    <span className="scene-heading">{scene.heading}</span>
                  </div>
                ))
              ) : (
                <div className="no-scenes">No scenes found</div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area - 40% (A4-like sheet) */}
        <main className="main-content">
          <div className="editor-container">
            <ScreenplayEditor
              ref={editorRef}
              initialValue={initialContent}
              onTitleChange={setCurrentDocument}
            />
          </div>
        </main>

        {/* Right Sidebar - 30% */}
        <aside className="app-sidebar right-sidebar">
          <div className="sidebar-section">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              <button onClick={handleNewDocument} className="sidebar-btn">New Document</button>
              <button onClick={handleSave} className="sidebar-btn primary">Save</button>
              <button onClick={() => setShowTitlePage(!showTitlePage)} className="sidebar-btn">
                {showTitlePage ? 'Hide Title Page' : 'Show Title Page'}
              </button>
              <button onClick={handleExportPDF} className="sidebar-btn secondary">Export PDF</button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Writing Tools</h3>
            <div className="tool-list">
              <div className="tool-item">
                <span className="tool-icon">📝</span>
                <span className="tool-name">Action</span>
                <span className="tool-shortcut">Enter</span>
              </div>
              <div className="tool-item">
                <span className="tool-icon">🎬</span>
                <span className="tool-name">Scene Heading</span>
                <span className="tool-shortcut">/scene</span>
              </div>
              <div className="tool-item">
                <span className="tool-icon">👤</span>
                <span className="tool-name">Character</span>
                <span className="tool-shortcut">Tab</span>
              </div>
              <div className="tool-item">
                <span className="tool-icon">💬</span>
                <span className="tool-name">Dialogue</span>
                <span className="tool-shortcut">Enter</span>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Status</h3>
            <div className="status-info">
              <div className="status-item">
                <span className="status-label">Ready</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Status Bar */}
      <footer className="app-status-bar">
        <div className="status-left">
          <span>Ready</span>
        </div>
        <div className="status-right">
          <span>Scenes: {scenes.length}</span>
          <span>Pages: ~{Math.ceil(scenes.length * 1.5)}</span>
        </div>
      </footer>
    </div>
  )
}

export default App
