'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Loader2, Check, CloudOff } from 'lucide-react'

interface DraftBoardControlsProps {
  hasSavedBoard: boolean
  saving: boolean
  hasChanges: boolean
  onSave: () => Promise<void>
}

export function DraftBoardControls({
  hasSavedBoard,
  saving,
  hasChanges,
  onSave,
}: DraftBoardControlsProps) {
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    await onSave()
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  // Reset success state when changes are made
  useEffect(() => {
    if (hasChanges) {
      setSaveSuccess(false)
    }
  }, [hasChanges])

  return (
    <div className="flex items-center gap-2">
      {/* Save Button */}
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || (!hasChanges && hasSavedBoard)}
        className={`h-8 text-xs transition-all ${
          saveSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : hasChanges
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        {saving ? (
          <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
        ) : saveSuccess ? (
          <Check className="h-3 w-3 mr-1.5" />
        ) : (
          <Save className="h-3 w-3 mr-1.5" />
        )}
        {saving
          ? 'Saving...'
          : saveSuccess
            ? 'Saved!'
            : hasSavedBoard
              ? 'Save Changes'
              : 'Save Board'}
      </Button>

      {/* Status indicator */}
      {hasChanges && hasSavedBoard && !saving && !saveSuccess && (
        <span className="text-xs text-amber-400 flex items-center gap-1">
          <CloudOff className="h-3 w-3" />
          Unsaved changes
        </span>
      )}
    </div>
  )
}
