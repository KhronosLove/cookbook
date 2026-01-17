'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { 
  Bold, Italic, List, ListOrdered, Heading2, Quote, 
  Strikethrough, Minus, Image as ImageIcon, Undo, Redo, Loader2 
} from 'lucide-react'
import { supabase } from '@/utils/supabase'
import { useState, useCallback } from 'react'

const MenuBar = ({ editor }) => {
  const [uploading, setUploading] = useState(false)

  // 1. Hook 必须在 if (!editor) 之前调用
  const addImage = useCallback(() => {
    if (!editor) return // 安全检查

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (event) => {
      const file = event.target.files[0]
      if (!file) return

      setUploading(true)
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('recipe-images')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('recipe-images')
          .getPublicUrl(filePath)

        if (data.publicUrl) {
          editor.chain().focus().setImage({ src: data.publicUrl }).run()
        }
      } catch (error) {
        alert('图片插入失败: ' + error.message)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }, [editor])

  // 2. 辅助函数也要放在 return null 之前
  const btnClass = (isActive) => 
    `p-2 rounded hover:bg-gray-100 transition-colors ${
      isActive ? 'bg-black text-white hover:bg-black' : 'text-gray-600'
    }`

  // 3. 所有 Hooks 和逻辑定义完后，再进行判断返回
  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-gray-50 rounded-t-lg">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="加粗">
        <Bold size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="斜体">
        <Italic size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="删除线">
        <Strikethrough size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="小标题">
        <Heading2 size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="无序列表">
        <List size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="有序列表">
        <ListOrdered size={18} />
      </button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="引用/贴士">
        <Quote size={18} />
      </button>
      <button onClick={() => editor.chain().focus().setHorizontalRule().run()} className={btnClass(false)} title="分割线">
        <Minus size={18} />
      </button>

      <div className="w-px h-6 bg-gray-300 mx-1"></div>

      <button onClick={addImage} disabled={uploading} className={btnClass(false)} title="插入图片">
        {uploading ? <Loader2 size={18} className="animate-spin"/> : <ImageIcon size={18} />}
      </button>
      
      <div className="flex-1"></div>
      
      <button onClick={() => editor.chain().focus().undo().run()} className={btnClass(false)}><Undo size={18}/></button>
      <button onClick={() => editor.chain().focus().redo().run()} className={btnClass(false)}><Redo size={18}/></button>
    </div>
  )
}

export default function TiptapEditor({ content, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-lg max-h-96 w-auto object-contain my-4 border border-gray-100',
        },
      }),
      Placeholder.configure({
        placeholder: '输入做法步骤... 支持有序列表(1. 2.)、拖拽图片或点击工具栏上传',
      }),
    ],
    content: content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    // 修复 SSR 错误
    immediatelyRender: false, 
  })

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm w-full">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}