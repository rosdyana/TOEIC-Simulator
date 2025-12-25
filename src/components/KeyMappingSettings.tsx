import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { storage } from '@/lib/storage';
import { KeyMapping, DEFAULT_KEY_MAPPING } from '@/types';
import { RotateCcw, Keyboard, CheckCircle, AlertCircle } from 'lucide-react';

interface KeyFieldConfig {
  field: keyof KeyMapping;
  label: string;
  description: string;
}

const keyFields: KeyFieldConfig[] = [
  { field: 'answerA', label: 'Answer A', description: 'Select option A' },
  { field: 'answerB', label: 'Answer B', description: 'Select option B' },
  { field: 'answerC', label: 'Answer C', description: 'Select option C' },
  { field: 'answerD', label: 'Answer D', description: 'Select option D' },
  { field: 'nextQuestion', label: 'Next Question', description: 'Move to next question' },
  { field: 'previousQuestion', label: 'Previous Question', description: 'Move to previous question' },
  { field: 'saveProgress', label: 'Save Progress', description: 'Save current progress' },
  { field: 'pauseResume', label: 'Pause/Resume', description: 'Toggle pause state' }
];

export function KeyMappingSettings() {
  const [mapping, setMapping] = useState<KeyMapping>(DEFAULT_KEY_MAPPING);
  const [editingKey, setEditingKey] = useState<keyof KeyMapping | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadedMapping = storage.getKeyMapping();
    setMapping(loadedMapping);
  }, []);

  const validateMapping = useCallback((newMapping: KeyMapping): { [key: string]: string } => {
    const newErrors: { [key: string]: string } = {};
    const usedKeys = new Map<string, string[]>();

    // Collect all key usages
    for (const { field } of keyFields) {
      const key = newMapping[field].toLowerCase();
      if (!usedKeys.has(key)) {
        usedKeys.set(key, []);
      }
      usedKeys.get(key)!.push(field);
    }

    // Mark duplicates as errors
    for (const [key, fields] of usedKeys) {
      if (fields.length > 1) {
        for (const field of fields) {
          newErrors[field] = `Key "${key.toUpperCase()}" is used by multiple actions`;
        }
      }
    }

    return newErrors;
  }, []);

  const handleKeyCapture = useCallback((field: keyof KeyMapping, event: React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const key = event.key.toLowerCase();
    
    // Ignore modifier-only key presses
    if (['shift', 'control', 'alt', 'meta'].includes(key)) {
      return;
    }

    // Handle special keys
    let displayKey = key;
    if (key === ' ') displayKey = 'space';
    if (key === 'enter') displayKey = 'enter';
    if (key === 'escape') displayKey = 'escape';
    if (key === 'tab') displayKey = 'tab';
    if (key === 'backspace') displayKey = 'backspace';
    if (key === 'arrowup') displayKey = 'arrowup';
    if (key === 'arrowdown') displayKey = 'arrowdown';
    if (key === 'arrowleft') displayKey = 'arrowleft';
    if (key === 'arrowright') displayKey = 'arrowright';

    const newMapping = { ...mapping, [field]: displayKey };
    setMapping(newMapping);
    setErrors(validateMapping(newMapping));
    setHasChanges(true);
    setSaved(false);
    setEditingKey(null);
  }, [mapping, validateMapping]);

  const handleSave = () => {
    const currentErrors = validateMapping(mapping);
    if (Object.keys(currentErrors).length > 0) {
      setErrors(currentErrors);
      return;
    }

    storage.saveKeyMapping(mapping);
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleReset = () => {
    if (confirm('Reset to default key mappings?')) {
      storage.resetKeyMapping();
      setMapping(DEFAULT_KEY_MAPPING);
      setErrors({});
      setHasChanges(false);
      setSaved(false);
    }
  };

  const getKeyDisplay = (key: string): string => {
    const displayMap: { [k: string]: string } = {
      'space': 'Space',
      'enter': 'Enter',
      'escape': 'Esc',
      'tab': 'Tab',
      'backspace': 'Backspace',
      'arrowup': 'Arrow Up',
      'arrowdown': 'Arrow Down',
      'arrowleft': 'Arrow Left',
      'arrowright': 'Arrow Right',
    };
    return displayMap[key] || key.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Keyboard Shortcuts</CardTitle>
              <CardDescription>
                Customize keyboard shortcuts for test navigation
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {keyFields.map(({ field, label, description }) => (
            <div 
              key={field} 
              className={`grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-3 rounded-lg transition-colors ${
                editingKey === field ? 'bg-blue-50 ring-2 ring-blue-300' : 'hover:bg-gray-50'
              } ${errors[field] ? 'bg-red-50' : ''}`}
            >
              <div>
                <Label htmlFor={field} className="font-medium text-sm">
                  {label}
                </Label>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  id={field}
                  onClick={() => setEditingKey(field)}
                  onKeyDown={(e) => {
                    if (editingKey === field) {
                      handleKeyCapture(field, e);
                    }
                  }}
                  onBlur={() => setEditingKey(null)}
                  className={`
                    min-w-[100px] px-4 py-2 border-2 rounded-lg text-center font-mono text-lg
                    focus:outline-none transition-all
                    ${editingKey === field 
                      ? 'border-blue-500 bg-white shadow-md animate-pulse' 
                      : errors[field]
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {editingKey === field ? (
                    <span className="text-blue-500 text-sm">Press a key...</span>
                  ) : (
                    <kbd className="text-gray-900">{getKeyDisplay(mapping[field])}</kbd>
                  )}
                </button>
                
                {errors[field] && (
                  <div className="flex items-center text-red-600 text-xs">
                    <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span>{errors[field]}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="pt-4 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              Click on a key field and press any key to change the binding.
            </div>
            <div className="flex items-center gap-3">
              {saved && (
                <div className="flex items-center text-green-600 text-sm animate-in fade-in">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Saved!
                </div>
              )}
              <Button 
                onClick={handleSave} 
                disabled={Object.keys(errors).length > 0 || !hasChanges}
              >
                Save Key Mappings
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
