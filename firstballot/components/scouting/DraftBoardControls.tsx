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
        title={
          saving
            ? 'Saving...'
            : saveSuccess
              ? 'Saved'
              : hasSavedBoard
                ? 'Save changes'
                : 'Save board'
        }
        className={`h-10 w-10 min-h-10 min-w-10 p-0 sm:h-7 sm:w-auto sm:min-h-0 sm:min-w-0 sm:px-2.5 text-[11px] transition-all ${
          saveSuccess
            ? 'bg-green-600 hover:bg-green-700'
            : hasChanges
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-slate-700 hover:bg-slate-600'
        }`}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 sm:h-3 sm:w-3 animate-spin" />
        ) : saveSuccess ? (
          <Check className="h-4 w-4 sm:h-3 sm:w-3" />
        ) : (
          <Save className="h-4 w-4 sm:h-3 sm:w-3" />
        )}
        <span className="sr-only">
          {saving
            ? 'Saving...'
            : saveSuccess
              ? 'Saved!'
              : hasSavedBoard
                ? 'Save Changes'
                : 'Save Board'}
        </span>
      </Button>

      {/* Status indicator */}
      {hasChanges && hasSavedBoard && !saving && !saveSuccess && (
        <span className="hidden sm:inline-flex text-xs text-blue-400 items-center gap-1">
          <CloudOff className="h-3 w-3" />
          Unsaved changes
        </span>
      )}
    </div>
  )
}
