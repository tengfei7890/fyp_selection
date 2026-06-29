import { Tag } from 'antd';
import {
  TopicStatus,
  TopicStatusLabels,
  ApplicationStatus,
  ApplicationStatusLabels,
  SelectionMode,
  SelectionModeLabels,
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
  return <Tag color={topicStatusColor[status]}>{TopicStatusLabels[status]}</Tag>;
}

export function ApplicationStatusTag({ status }: { status: ApplicationStatus }) {
  return <Tag color={appStatusColor[status]}>{ApplicationStatusLabels[status]}</Tag>;
}

export function SelectionModeTag({ mode }: { mode: SelectionMode }) {
  return <Tag color={modeColor[mode]}>{SelectionModeLabels[mode]}</Tag>;
}
