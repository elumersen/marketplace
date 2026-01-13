import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Lock, Key, Shield } from 'lucide-react';
import { CompanySettings } from '@/types/api.types';

interface BookLockAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticate: (password?: string, pin?: string) => void;
  settings?: CompanySettings;
  lockDate?: string;
  title?: string;
  description?: string;
}

export const BookLockAuthDialog: React.FC<BookLockAuthDialogProps> = ({
  open,
  onOpenChange,
  onAuthenticate,
  settings,
  lockDate,
  title = 'Authentication Required',
  description,
}) => {
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [authMethod, setAuthMethod] = useState<'password' | 'pin'>('password');

  const handleSubmit = () => {
    onAuthenticate(password || undefined, pin || undefined);
    setPassword('');
    setPin('');
    setAuthMethod('password');
  };

  const defaultDescription = lockDate
    ? `This transaction is dated on or before ${new Date(lockDate).toLocaleDateString()}, which is locked. Please authenticate to make changes.`
    : 'Please authenticate to make changes to locked books.';

  const hasPassword = settings?.hasLockBooksPassword;
  const hasPIN = settings?.hasLockBooksPIN;

  // Set default auth method based on what's available
  useEffect(() => {
    if (authMethod === 'password' && !hasPassword && hasPIN) {
      setAuthMethod('pin');
    } else if (authMethod === 'pin' && !hasPIN && hasPassword) {
      setAuthMethod('password');
    }
  }, [hasPassword, hasPIN, authMethod]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description || defaultDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {(hasPassword && hasPIN) && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Choose Authentication Method</Label>
              <ToggleGroup
                type="single"
                value={authMethod}
                onValueChange={(value) => value && setAuthMethod(value as 'password' | 'pin')}
                className="grid grid-cols-2 gap-2"
              >
                <ToggleGroupItem
                  value="password"
                  aria-label="Password"
                  className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Key className="h-4 w-4" />
                  <span>Password</span>
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="pin"
                  aria-label="PIN"
                  className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Lock className="h-4 w-4" />
                  <span>4-Digit PIN</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}

          {authMethod === 'password' && hasPassword && (
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
              <Label htmlFor="authPassword" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="authPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) {
                    handleSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          )}

          {authMethod === 'pin' && hasPIN && (
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
              <Label htmlFor="authPIN" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                4-Digit PIN
              </Label>
              <Input
                id="authPIN"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(value);
                }}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                className="w-full text-center text-2xl tracking-widest font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pin) {
                    handleSubmit();
                  }
                }}
                autoFocus
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {
            onOpenChange(false);
            setPassword('');
            setPin('');
            setAuthMethod('password');
          }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!password && !pin}>
            Authenticate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

