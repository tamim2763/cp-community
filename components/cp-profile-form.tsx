"use client";

import { CpPlatform, ProfileStatus } from "@prisma/client";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

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

export function CpProfileForm({ platform, title, placeholder, description, profile }: Props) {
  const [saveState, saveFormAction] = useActionState(saveCpProfileAction, initialState);
  const [challengeState, challengeFormAction] = useActionState(createVerificationChallengeAction, initialState);
  const [verifyState, verifyFormAction] = useActionState(verifyOwnershipAction, initialState);
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
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

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
        <span className="badge">{profile ? "Linked" : "Not linked"}</span>
      </div>

      {profile ? (
        <div className="linked-profile-meta">
          {profile.avatarUrl ? (
            <div className="linked-profile-identity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatarUrl} alt={`${profile.displayHandle ?? profile.handle} avatar`} className="profile-avatar" />
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
              <p>Submit a compilation error to the following problem to verify yourself.</p>
              <a className="auth-button problem-link-button" href={challenge.problemUrl} target="_blank" rel="noreferrer">
                Problem link
              </a>
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
            {profile ? (
              <button className="auth-button" type="button" onClick={() => setIsEditing(true)}>
                Update handle
              </button>
            ) : null}

            {profile ? (
              <form action={unlinkCpProfileAction}>
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
          ) : (
            <p className="form-success">Verified.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
