'use client'

import { useState } from 'react'
import { Save, X } from 'lucide-react'

interface ScriptEditorProps {
  script: string
  onSave: (script: string) => void
  onCancel: () => void
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
}

export function ScriptEditor({ script, onSave, onCancel }: ScriptEditorProps) {
  const [editedScript, setEditedScript] = useState(script)

  const handleSave = () => {
    onSave(editedScript)
  }

  return (
    <div className="space-y-4">
      <textarea
        value={editedScript}
        onChange={(e) => setEditedScript(e.target.value)}
        className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm text-black"
        placeholder="Edit your podcast script here..."
      />
      
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}