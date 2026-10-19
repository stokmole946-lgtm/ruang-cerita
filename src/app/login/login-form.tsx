"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react";
import { loginAction } from "@/app/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="login-submit" type="submit" disabled={pending}>
      <span>{pending ? "Memeriksa akun..." : "Masuk ke Ruang Cerita"}</span>
      <ArrowRight size={20} weight="bold" />
    </button>
  );
}

export function LoginForm({ error }: { error?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={loginAction} className="login-form">
      {error ? (
        <div className="login-error rounded-[6px]" role="alert">
          <WarningCircle size={20} weight="fill" className="shrink-0" />
          <span className="font-bold">{error}</span>
        </div>
      ) : null}

      <div className="ios-field-group">
        <label className="ios-field-row">
          <div className="ios-field-content">
            <span className="ios-field-label">Username</span>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              placeholder="contoh: amira atau mfauzi"
            />
          </div>
        </label>

        <label className="ios-field-row">
          <div className="ios-field-content">
            <span className="ios-field-label">Password</span>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="Masukkan password..."
            />
          </div>
          <button
            className="password-toggle"
            type="button"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeSlash size={22} weight="bold" /> : <Eye size={22} weight="bold" />}
          </button>
        </label>
      </div>

      <SubmitButton />
    </form>
  );
}
