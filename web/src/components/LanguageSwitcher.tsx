import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { LANGS } from '@/i18n';

const LABELS: Record<string, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
};

/** 当前语言（归一化到 LANGS 之一） */
function currentLang(i18nLanguage: string | undefined) {
  return i18nLanguage?.toLowerCase().startsWith('en') ? 'en-US' : 'zh-CN';
}

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const value = currentLang(i18n.language);
  return (
    <Select
      size="small"
      variant="borderless"
      value={value}
      onChange={(l) => i18n.changeLanguage(l)}
      options={LANGS.map((l) => ({ value: l, label: LABELS[l] }))}
      style={{ width: 92 }}
    />
  );
}
