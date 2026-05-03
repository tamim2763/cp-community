"use client";

import { CpPlatform, ProfileStatus } from "@prisma/client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  createVerificationChallengeAction,
  saveCpProfileAction,
  type CpProfileFormState,
  unlinkCpProfileAction,
  verifyOwnershipAction,
} from "@/app/actions/cp-profile";
import { parseChallenge } from "@/lib/cp-challenge";
import { AuthSubmitButton } from "@/components/auth-submit-button";

type CpProfileSummary = {
  platform: CpPlatform;
  handle: string;
  displayHandle: string | null;
  status: ProfileStatus;
  isVerified: boolean;
  currentRating: number | null;
  maxRating: number | null;
  rankTitle: string | null;
  country: string | null;
  avatarUrl: string | null;
  verificationToken: string | null;
  verificationField: string | null;
  syncError: string | null;
};

type Props = {
  platform: CpPlatform;
  title: string;
  placeholder: string;
  description: string;
  profile?: CpProfileSummary;
  fallbackAvatarUrl?: string | null;
};

const initialState: CpProfileFormState = { error: null, success: null };

function getStatusLabel(status: ProfileStatus, isVerified: boolean) {
  if (isVerified) return "Ownership verified";
  switch (status) {
    case ProfileStatus.ACTIVE:
      return "Profile linked, ownership pending";
    case ProfileStatus.ERROR:
      return "Needs attention";
    case ProfileStatus.PENDING:
    default:
      return "Pending sync";
  }
}

export function CpProfileForm({ platform, title, placeholder, description, profile, fallbackAvatarUrl }: Props) {
  const [saveState, saveFormAction] = useActionState(saveCpProfileAction, initialState);
  const [challengeState, challengeFormAction] = useActionState(createVerificationChallengeAction, initialState);
  const [verifyState, verifyFormAction] = useActionState(verifyOwnershipAction, initialState);
  // manual solved-problem entry is now handled in the Dashboard Solve Entry panel
  const [unlinkState, unlinkFormAction] = useActionState(unlinkCpProfileAction as any, { error: null, success: null } as any);
  const challenge = profile?.verificationField ? parseChallenge(profile.verificationField) : null;
  const [isEditing, setIsEditing] = useState(!profile);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) {
      setIsEditing(true);
      return;
    }

    setIsEditing(false);
  }, [profile?.handle]);

  useEffect(() => {
    if (isEditing) {
      if (!profile) return;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing, profile]);

  const router = useRouter();

  useEffect(() => {
    if (unlinkState.success) {
      // refresh server data so dashboard reflects the unlinked profile
      router.refresh();
    }
  }, [unlinkState.success, router]);

  const feedback = useMemo(() => {
    if (verifyState.error || verifyState.success) return verifyState;
    if (challengeState.error || challengeState.success) return challengeState;
    return saveState;
  }, [challengeState, saveState, verifyState]);

  const verifyButtonAction = challenge ? verifyFormAction : challengeFormAction;

  return (
    <article className="card platform-card">
      <div className="platform-card-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <span className={profile ? "badge" : "badge badge-rect"}>
          {profile ? "Linked" : "Not linked"}
        </span>
      </div>

      {profile ? (
        <div className="linked-profile-meta">
          { (profile.avatarUrl || fallbackAvatarUrl) ? (
            <div className="linked-profile-identity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatarUrl ?? fallbackAvatarUrl ?? ""} alt={`${profile.displayHandle ?? profile.handle} avatar`} className="profile-avatar" />
              <div>
                <p>
                  Current handle: <strong>{profile.displayHandle ?? profile.handle}</strong>
                </p>
                <p>Status: {getStatusLabel(profile.status, profile.isVerified)}</p>
              </div>
            </div>
          ) : (
            <>
              <p>
                Current handle: <strong>{profile.displayHandle ?? profile.handle}</strong>
              </p>
              <p>Status: {getStatusLabel(profile.status, profile.isVerified)}</p>
            </>
          )}
          {profile.country ? <p>Country: {profile.country}</p> : null}
          {profile.rankTitle ? <p>Rank: {profile.rankTitle}</p> : null}
          {profile.currentRating !== null ? <p>Current rating: {profile.currentRating}</p> : null}
          {profile.maxRating !== null ? <p>Max rating: {profile.maxRating}</p> : null}
          {!profile.isVerified && challenge ? (
            <div className="verification-box">
              {platform === "ATCODER" ? (
                <>
                  <p style={{ marginBottom: 12 }}>Copy the token below and temporarily paste it anywhere into your AtCoder <strong>Affiliation</strong> field (Settings &gt; Profile &gt; Affiliation). Then click Verify handle.</p>
                  <div style={{ background: "var(--bg-3)", padding: "10px", borderRadius: "var(--radius-sm)", fontFamily: "monospace", textAlign: "center", fontWeight: 700, fontSize: "1.1rem", border: "1px dashed var(--border-2)" }}>
                    {challenge.challengeCode}
                  </div>
                </>
              ) : (
                <>
                  <p>Submit a compilation error to the following problem to verify yourself.</p>
                  {/* force Codeforces to open desktop view when possible */}
                  <a
                    className="auth-button problem-link-button"
                    href={platform === "CODEFORCES" ? `${challenge.problemUrl}?mobile=false` : challenge.problemUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Problem link
                  </a>
                </>
              )}
            </div>
          ) : null}
          {profile.syncError ? <p className="form-error">{profile.syncError}</p> : null}
        </div>
      ) : null}

      {isEditing ? (
        <form className="auth-form compact-form" action={saveFormAction}>
          <input type="hidden" name="platform" value={platform} />

          <div className="field-group">
            <label htmlFor={`${platform}-handle`}>Handle</label>
            <input
              ref={inputRef}
              id={`${platform}-handle`}
              name="handle"
              type="text"
              placeholder={placeholder}
              defaultValue={profile?.displayHandle ?? profile?.handle ?? ""}
              required
            />
          </div>

          {feedback.error ? <p className="form-error">{feedback.error}</p> : null}
          {feedback.success ? <p className="form-success">{feedback.success}</p> : null}

          <div className="platform-actions">
            <AuthSubmitButton
              label={profile ? "Save handle" : "Link handle"}
              pendingLabel={profile ? "Saving..." : "Linking..."}
            />

            {profile ? (
              <button className="auth-button secondary-button" type="button" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="compact-form static-handle-block">
          <div className="field-group">
            <label>Handle</label>
            <div className="static-handle-value">{profile?.displayHandle ?? profile?.handle}</div>
          </div>

          {feedback.error ? <p className="form-error">{feedback.error}</p> : null}
          {feedback.success ? <p className="form-success">{feedback.success}</p> : null}

          <div className="platform-actions">
            {profile && profile.isVerified ? (
              <button className="auth-button" type="button" onClick={() => setIsEditing(true)}>
                Update handle
              </button>
            ) : null}

            {profile && profile.isVerified ? (
              <form action={unlinkFormAction}>
                <input type="hidden" name="platform" value={platform} />
                <button className="auth-button secondary-button" type="submit">
                  Unlink
                </button>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {profile ? (
        <div className="verification-actions">
          {!profile.isVerified ? (
            <form action={verifyButtonAction}>
              <input type="hidden" name="platform" value={platform} />
              <button className="auth-button" type="submit">
                Verify handle
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {/* Manual solved-problem entry moved to Dashboard Solve Entry panel */}
    </article>
  );
}
