import type { QueryKey, UseMutationOptions, UseMutationResult, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import type { CredentialsInput, CurrentUser, CurrentUserEnvelope, ErrorEnvelope, HealthStatus, LeaderboardEntry, LogoutResult, ScoreEntry, SetNameColorInput, SubmitScoreInput } from "./api.schemas";
import { customFetch } from "../custom-fetch";
import type { ErrorType, BodyType } from "../custom-fetch";
type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;
type SecondParameter<T extends (...args: never) => unknown> = Parameters<T>[1];
/**
 * Returns server health status
 * @summary Health check
 */
export declare const getHealthCheckUrl: () => string;
export declare const healthCheck: (options?: RequestInit) => Promise<HealthStatus>;
export declare const getHealthCheckQueryKey: () => readonly ["/api/healthz"];
export declare const getHealthCheckQueryOptions: <TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData> & {
    queryKey: QueryKey;
};
export type HealthCheckQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheck>>>;
export type HealthCheckQueryError = ErrorType<unknown>;
/**
 * @summary Health check
 */
export declare function useHealthCheck<TData = Awaited<ReturnType<typeof healthCheck>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof healthCheck>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Create a new account with a username and password
 */
export declare const getSignupUrl: () => string;
export declare const signup: (credentialsInput: CredentialsInput, options?: RequestInit) => Promise<CurrentUser>;
export declare const getSignupMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof signup>>, TError, {
        data: BodyType<CredentialsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof signup>>, TError, {
    data: BodyType<CredentialsInput>;
}, TContext>;
export type SignupMutationResult = NonNullable<Awaited<ReturnType<typeof signup>>>;
export type SignupMutationBody = BodyType<CredentialsInput>;
export type SignupMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary Create a new account with a username and password
 */
export declare const useSignup: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof signup>>, TError, {
        data: BodyType<CredentialsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof signup>>, TError, {
    data: BodyType<CredentialsInput>;
}, TContext>;
/**
 * @summary Log in with a username and password
 */
export declare const getLoginUrl: () => string;
export declare const login: (credentialsInput: CredentialsInput, options?: RequestInit) => Promise<CurrentUser>;
export declare const getLoginMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<CredentialsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<CredentialsInput>;
}, TContext>;
export type LoginMutationResult = NonNullable<Awaited<ReturnType<typeof login>>>;
export type LoginMutationBody = BodyType<CredentialsInput>;
export type LoginMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary Log in with a username and password
 */
export declare const useLogin: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof login>>, TError, {
        data: BodyType<CredentialsInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof login>>, TError, {
    data: BodyType<CredentialsInput>;
}, TContext>;
/**
 * @summary Log out the current session
 */
export declare const getLogoutUrl: () => string;
export declare const logout: (options?: RequestInit) => Promise<LogoutResult>;
export declare const getLogoutMutationOptions: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
export type LogoutMutationResult = NonNullable<Awaited<ReturnType<typeof logout>>>;
export type LogoutMutationError = ErrorType<unknown>;
/**
 * @summary Log out the current session
 */
export declare const useLogout: <TError = ErrorType<unknown>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof logout>>, TError, void, TContext>;
/**
 * @summary Get the currently signed-in user (or null)
 */
export declare const getGetCurrentUserUrl: () => string;
export declare const getCurrentUser: (options?: RequestInit) => Promise<CurrentUserEnvelope>;
export declare const getGetCurrentUserQueryKey: () => readonly ["/api/auth/me"];
export declare const getGetCurrentUserQueryOptions: <TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetCurrentUserQueryResult = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export type GetCurrentUserQueryError = ErrorType<unknown>;
/**
 * @summary Get the currently signed-in user (or null)
 */
export declare function useGetCurrentUser<TData = Awaited<ReturnType<typeof getCurrentUser>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getCurrentUser>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
/**
 * @summary Set the signed-in player's leaderboard name color (rank 1 only)
 */
export declare const getSetNameColorUrl: () => string;
export declare const setNameColor: (setNameColorInput: SetNameColorInput, options?: RequestInit) => Promise<CurrentUser>;
export declare const getSetNameColorMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setNameColor>>, TError, {
        data: BodyType<SetNameColorInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof setNameColor>>, TError, {
    data: BodyType<SetNameColorInput>;
}, TContext>;
export type SetNameColorMutationResult = NonNullable<Awaited<ReturnType<typeof setNameColor>>>;
export type SetNameColorMutationBody = BodyType<SetNameColorInput>;
export type SetNameColorMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary Set the signed-in player's leaderboard name color (rank 1 only)
 */
export declare const useSetNameColor: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof setNameColor>>, TError, {
        data: BodyType<SetNameColorInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof setNameColor>>, TError, {
    data: BodyType<SetNameColorInput>;
}, TContext>;
/**
 * @summary Submit a final game score for the authenticated player
 */
export declare const getSubmitScoreUrl: () => string;
export declare const submitScore: (submitScoreInput: SubmitScoreInput, options?: RequestInit) => Promise<ScoreEntry>;
export declare const getSubmitScoreMutationOptions: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitScore>>, TError, {
        data: BodyType<SubmitScoreInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationOptions<Awaited<ReturnType<typeof submitScore>>, TError, {
    data: BodyType<SubmitScoreInput>;
}, TContext>;
export type SubmitScoreMutationResult = NonNullable<Awaited<ReturnType<typeof submitScore>>>;
export type SubmitScoreMutationBody = BodyType<SubmitScoreInput>;
export type SubmitScoreMutationError = ErrorType<ErrorEnvelope>;
/**
 * @summary Submit a final game score for the authenticated player
 */
export declare const useSubmitScore: <TError = ErrorType<ErrorEnvelope>, TContext = unknown>(options?: {
    mutation?: UseMutationOptions<Awaited<ReturnType<typeof submitScore>>, TError, {
        data: BodyType<SubmitScoreInput>;
    }, TContext>;
    request?: SecondParameter<typeof customFetch>;
}) => UseMutationResult<Awaited<ReturnType<typeof submitScore>>, TError, {
    data: BodyType<SubmitScoreInput>;
}, TContext>;
/**
 * @summary Top 10 highest scores across all signed-in players
 */
export declare const getGetLeaderboardUrl: () => string;
export declare const getLeaderboard: (options?: RequestInit) => Promise<LeaderboardEntry[]>;
export declare const getGetLeaderboardQueryKey: () => readonly ["/api/leaderboard"];
export declare const getGetLeaderboardQueryOptions: <TData = Awaited<ReturnType<typeof getLeaderboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}) => UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData> & {
    queryKey: QueryKey;
};
export type GetLeaderboardQueryResult = NonNullable<Awaited<ReturnType<typeof getLeaderboard>>>;
export type GetLeaderboardQueryError = ErrorType<unknown>;
/**
 * @summary Top 10 highest scores across all signed-in players
 */
export declare function useGetLeaderboard<TData = Awaited<ReturnType<typeof getLeaderboard>>, TError = ErrorType<unknown>>(options?: {
    query?: UseQueryOptions<Awaited<ReturnType<typeof getLeaderboard>>, TError, TData>;
    request?: SecondParameter<typeof customFetch>;
}): UseQueryResult<TData, TError> & {
    queryKey: QueryKey;
};
export {};
//# sourceMappingURL=api.d.ts.map