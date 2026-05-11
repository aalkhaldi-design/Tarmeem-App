/* Common props shared by every workflow form component */

import type { FormRecord, FormsApi } from '../../Forms';
import type { UserProfile } from '../../Auth';
import type { ProjectRecord } from '../../forms/FormRenderers';

export interface SharedFormProps {
  rec?: FormRecord;
  user: UserProfile;
  users: UserProfile[];
  api: FormsApi;
  project: ProjectRecord;
  isEditable: boolean;
  isCompleted: boolean;
}

export type { FormRecord, FormsApi, UserProfile, ProjectRecord };
