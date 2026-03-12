'use client'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'

// Third-party Imports
import { Bold } from '@tiptap/extension-bold'
import { Italic } from '@tiptap/extension-italic'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Strike } from '@tiptap/extension-strike'
import { TextAlign } from '@tiptap/extension-text-align'
import { Underline } from '@tiptap/extension-underline'
import type { Editor } from '@tiptap/react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import classnames from 'classnames'

// Components Imports
import CustomIconButton from '@core/components/mui/IconButton'
import CustomTextField from '@core/components/mui/TextField'

// Style Imports
import '@/libs/styles/tiptapEditor.css'

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  const editorState = useEditorState({
    editor,
    selector: ctx => {
      if (!ctx.editor) {
        return {
          isBold: false,
          isItalic: false,
          isUnderline: false,
          isStrike: false,
          isLeftAligned: true, // Default to true when no editor
          isCenterAligned: false,
          isRightAligned: false,
          isJustified: false
        }
      }

      return {
        isBold: ctx.editor.isActive('bold') ?? false,
        isItalic: ctx.editor.isActive('italic') ?? false,
        isUnderline: ctx.editor.isActive('underline') ?? false,
        isStrike: ctx.editor.isActive('strike') ?? false,
        isLeftAligned: ctx.editor.isActive({ textAlign: 'left' }) ?? false,
        isCenterAligned: ctx.editor.isActive({ textAlign: 'center' }) ?? false,
        isRightAligned: ctx.editor.isActive({ textAlign: 'right' }) ?? false,
        isJustified: ctx.editor.isActive({ textAlign: 'justify' }) ?? false
      }
    }
  })

  if (!editor || !editorState) {
    return null
  }

  return (
    <div className='flex flex-wrap gap-x-3 gap-y-1 pbs-6 pbe-4 pli-6'>
      <CustomIconButton
        {...(editorState.isBold && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <i className={classnames('tabler-bold', { 'text-textSecondary': !editorState.isBold })} />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isUnderline && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <i className={classnames('tabler-underline', { 'text-textSecondary': !editorState.isUnderline })} />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isItalic && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i className={classnames('tabler-italic', { 'text-textSecondary': !editorState.isItalic })} />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isStrike && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <i className={classnames('tabler-strikethrough', { 'text-textSecondary': !editorState.isStrike })} />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isLeftAligned && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <i className={classnames('tabler-align-left', { 'text-textSecondary': !editorState.isLeftAligned })} />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isCenterAligned && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <i
          className={classnames('tabler-align-center', {
            'text-textSecondary': !editorState.isCenterAligned
          })}
        />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isRightAligned && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <i
          className={classnames('tabler-align-right', {
            'text-textSecondary': !editorState.isRightAligned
          })}
        />
      </CustomIconButton>
      <CustomIconButton
        {...(editorState.isJustified && { color: 'primary' })}
        variant='tonal'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <i
          className={classnames('tabler-align-justified', {
            'text-textSecondary': !editorState.isJustified
          })}
        />
      </CustomIconButton>
    </div>
  )
}

const ProductInformation = () => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
        underline: false
      }),
      Placeholder.configure({
        placeholder: 'Write something here...'
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Bold,
      Italic,
      Strike,
      Underline
    ],
    immediatelyRender: false,
    content: `
      <p>
        Keep your account secure with authentication step.
      </p>
    `
  })

  return (
    <Card>
      <CardHeader title='Product Information' />
      <CardContent>
        <Grid container spacing={6} className='mbe-6'>
          <Grid size={{ xs: 12 }}>
            <CustomTextField fullWidth label='Product Name' placeholder='iPhone 14' />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField fullWidth label='SKU' placeholder='FXSK123U' />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <CustomTextField fullWidth label='Barcode' placeholder='0123-4567' />
          </Grid>
        </Grid>
        <Typography className='mbe-1'>Description (Optional)</Typography>
        <Card className='p-0 border shadow-none'>
          <CardContent className='p-0'>
            <EditorToolbar editor={editor} />
            <Divider className='mli-6' />
            <EditorContent editor={editor} className='bs-[135px] overflow-y-auto flex ' />
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}

export default ProductInformation
