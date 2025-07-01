import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from 'react-query';
import { RemoteWithRefs } from 'simple-git';
import { CustomError, FileStatus, GitBranch } from '../../types/backend';
import { QUERY_KEYS } from '../config/constants';
import { gitServices } from '../services';
import * as updateService from '../services/update.service';
import { useCallback } from 'react';

export function useCheckForUpdates() {
  return useCallback(() => updateService.checkForUpdates(), []);
}

export function useCheckForSettingsUpdates() {
  return useCallback(() => updateService.checkForSettingsUpdates(), []);
}

export function useDownloadUpdate() {
  return useCallback(() => updateService.downloadUpdate(), []);
}

export function useRestartUpdate() {
  return useCallback(() => updateService.restartUpdate(), []);
}

export function useRejectUpdateVersion() {
  return useCallback(
    (version: string) => updateService.rejectUpdateVersion(version),
    [],
  );
}
