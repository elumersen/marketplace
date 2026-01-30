import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Eye, EyeOff, Key, Lock, Shield } from "lucide-react";
import { CompanySettings } from "@/types/api.types";

interface BookLockAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthenticate: (
    password?: string,
    pin?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
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
  title = "Authentication Required",
  description,
}) => {
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "pin">("password");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [pinVisible, setPinVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const reset = () => {
    setPassword("");
    setPin("");
    setAuthMethod("password");
    setPasswordVisible(false);
    setPinVisible(false);
    setSubmitting(false);
    setAuthError(null);
  };

  const handleSubmit = async () => {
    if (!password && !pin) return;
    try {
      setSubmitting(true);
      setAuthError(null);
      const result = await onAuthenticate(
        password || undefined,
        pin || undefined,
      );
      if (result.ok) {
        reset();
        onOpenChange(false);
        return;
      }
      setAuthError(
        result.error || "Invalid authentication credentials. Please try again.",
      );
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : "Invalid authentication credentials. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const defaultDescription = lockDate
    ? `This transaction is dated on or before ${new Date(lockDate).toLocaleDateString()}, which is locked. Please authenticate to make changes.`
    : "Please authenticate to make changes to locked books.";

  const hasPassword = settings?.hasLockBooksPassword;
  const hasPIN = settings?.hasLockBooksPIN;

  // Set default auth method based on what's available
  useEffect(() => {
    if (authMethod === "password" && !hasPassword && hasPIN) {
      setAuthMethod("pin");
    } else if (authMethod === "pin" && !hasPIN && hasPassword) {
      setAuthMethod("password");
    }
  }, [hasPassword, hasPIN, authMethod]);

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    } else {
      // Clear stale error when reopening
      setAuthError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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
          {authError && (
            <Alert variant="destructive">
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}

          {hasPassword && hasPIN && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Choose Authentication Method
              </Label>
              <ToggleGroup
                type="single"
                value={authMethod}
                onValueChange={(value) =>
                  value && setAuthMethod(value as "password" | "pin")
                }
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

          {authMethod === "password" && hasPassword && (
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
              <Label htmlFor="authPassword" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password
              </Label>
              <div className="relative">
                <Input
                  id="authPassword"
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && password) {
                      void handleSubmit();
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={
                    passwordVisible ? "Hide password" : "Show password"
                  }
                >
                  {passwordVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {authMethod === "pin" && hasPIN && (
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-top-2">
              <Label htmlFor="authPIN" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                4-Digit PIN
              </Label>
              <div className="relative">
                <Input
                  id="authPIN"
                  type={pinVisible ? "text" : "password"}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(value);
                  }}
                  placeholder="Enter 4-digit PIN"
                  maxLength={4}
                  className="w-full text-center text-2xl tracking-widest font-mono pr-10"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && pin) {
                      void handleSubmit();
                    }
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setPinVisible((v) => !v)}
                  aria-label={pinVisible ? "Hide PIN" : "Show PIN"}
                >
                  {pinVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || (!password && !pin)}
          >
            {submitting ? "Authenticating..." : "Authenticate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
