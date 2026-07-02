import { Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  TopicStatus,
  ApplicationStatus,
  SelectionMode,
} from '@shared/enums';

const topicStatusColor: Record<TopicStatus, string> = {
  [TopicStatus.DRAFT]: 'default',
  [TopicStatus.OPEN]: 'green',
  [TopicStatus.SELECTING]: 'processing',
  [TopicStatus.CLOSED]: 'orange',
  [TopicStatus.LOCKED]: 'red',
};

const appStatusColor: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDING]: 'processing',
  [ApplicationStatus.ACCEPTED]: 'green',
  [ApplicationStatus.REJECTED]: 'red',
  [ApplicationStatus.WITHDRAWN]: 'default',
};

const modeColor: Record<SelectionMode, string> = {
  [SelectionMode.DIRECT]: 'purple',
  [SelectionMode.MUTUAL]: 'blue',
  [SelectionMode.RANDOM]: 'cyan',
  [SelectionMode.RANGE_RANDOM]: 'geekblue',
};

export function TopicStatusTag({ status }: { status: TopicStatus }) {
  const { t } = useTranslation();
  return <Tag color={topicStatusColor[status]}>{t('topicStatus.' + status)}</Tag>;
}

export function ApplicationStatusTag({ status }: { status: ApplicationStatus }) {
  const { t } = useTranslation();
  return <Tag color={appStatusColor[status]}>{t('appStatus.' + status)}</Tag>;
}

export function SelectionModeTag({ mode }: { mode: SelectionMode }) {
  const { t } = useTranslation();
  return <Tag color={modeColor[mode]}>{t('selectionMode.' + mode)}</Tag>;
}
