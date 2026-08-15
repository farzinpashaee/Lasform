package com.csl.lasform.auth.application;

/** {@code tokens} is null exactly when {@code pendingApproval} is true — see AuthenticationService#googleAuth. */
public record GoogleAuthResult(boolean pendingApproval, LoginResult tokens) {

    public static GoogleAuthResult pending() {
        return new GoogleAuthResult(true, null);
    }

    public static GoogleAuthResult authenticated(LoginResult tokens) {
        return new GoogleAuthResult(false, tokens);
    }
}
