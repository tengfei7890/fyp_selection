import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, Button, List, Badge, Input, Select, Empty, Tag, Space, Spin, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { messageApi } from '@/api';
import type { Conversation, MessageItem } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import RecipientPickerModal from '@/components/RecipientPickerModal';

interface Partner { id: number; name: string }

export default function Messages() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [thread, setThread] = useState<MessageItem[]>([]);
  const [tagTopics, setTagTopics] = useState<{ id: number; title: string }[]>([]);
  const [text, setText] = useState('');
  const [tagTopicId, setTagTopicId] = useState<number | undefined>(undefined);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try { setConversations(await messageApi.conversations()); } catch { /* ignore */ }
  }, []);

  const loadThread = useCallback(async (pid: number) => {
    setLoadingThread(true);
    try {
      setThread(await messageApi.thread(pid));
      await loadConversations();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setLoadingThread(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    loadConversations();
    const pid = searchParams.get('partnerId');
    const pname = searchParams.get('partnerName');
    if (pid) {
      const id = Number(pid);
      setPartner({ id, name: pname || '' });
      loadThread(id);
    }
    const tid = searchParams.get('topicId');
    if (tid) setTagTopicId(Number(tid));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      loadConversations();
      if (partner) messageApi.thread(partner.id).then(setThread).catch(() => undefined);
    }, 10000);
    return () => clearInterval(id);
  }, [partner, loadConversations]);

  useEffect(() => {
    if (!partner) { setTagTopics([]); return; }
    messageApi.contextTopics(partner.id).then(setTagTopics).catch(() => setTagTopics([]));
  }, [partner]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const selectConversation = (c: Conversation) => {
    setPartner({ id: c.partner.id, name: c.partner.name });
    setText('');
    loadThread(c.partner.id);
  };

  const startNew = (r: Partner) => {
    setPickerOpen(false);
    setPartner(r);
    setThread([]);
    setText('');
  };

  const send = async () => {
    if (!partner || !text.trim()) return;
    setSending(true);
    try {
      const m = await messageApi.send({ receiverId: partner.id, content: text.trim(), topicId: tagTopicId });
      setThread((prev) => [...prev, m]);
      setText('');
      loadConversations();
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', gap: 16, padding: 0 }}>
      <Card
        title={t('messages.conversations')}
        size="small"
        style={{ width: 320, flexShrink: 0 }}
        extra={
          <Space size="small">
            <Button size="small" icon={<ReloadOutlined />} onClick={loadConversations} />
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
              {t('messages.new')}
            </Button>
          </Space>
        }
      >
        <List
          dataSource={conversations}
          locale={{ emptyText: <Empty description={t('messages.emptyConv')} /> }}
          renderItem={(c) => (
            <List.Item
              onClick={() => selectConversation(c)}
              style={{ cursor: 'pointer', background: partner?.id === c.partner.id ? '#e6f4ff' : undefined, padding: '8px 12px', borderRadius: 6 }}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{c.partner.name}</span>
                    <Tag>{t('role.' + c.partner.role)}</Tag>
                    {c.unread > 0 && <Badge count={c.unread} />}
                  </Space>
                }
                description={<span style={{ color: '#888' }}>{c.lastMessage?.senderId === user!.id ? t('messages.me') : ''}{c.lastMessage?.content?.slice(0, 24) ?? ''}</span>}
              />
            </List.Item>
          )}
        />
      </Card>

      <Card
        size="small"
        style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        title={partner ? t('messages.withPartner', { name: partner.name || t('messages.withPartnerFallback') }) : t('messages.selectPrompt')}
      >
        {!partner ? (
          <Empty style={{ margin: 'auto' }} description={t('messages.emptyThreadSelect')} />
        ) : (
          <>
            <Spin spinning={loadingThread}>
              <div style={{ flex: 1, overflow: 'auto', padding: 8, minHeight: 280 }}>
                {thread.length === 0 ? (
                  <Empty description={t('messages.emptyThread')} style={{ marginTop: 60 }} />
                ) : (
                  thread.map((m) => {
                    const mine = m.senderId === user!.id;
                    return (
                      <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                        <div style={{ maxWidth: '70%', background: mine ? '#1677ff' : '#f0f0f0', color: mine ? '#fff' : '#333', padding: '8px 12px', borderRadius: 8 }}>
                          {m.topic?.title && (
                            <div style={{ marginBottom: 4 }}>
                              <Tag style={{ margin: 0 }}>{t('messages.topicTagPrefix')}{m.topic.title}</Tag>
                            </div>
                          )}
                          <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>{new Date(m.createdAt).toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
            </Spin>

            <div style={{ borderTop: '1px solid #eee', paddingTop: 12 }}>
              <Space.Compact style={{ width: '100%', marginBottom: 8 }}>
                <Select
                  allowClear
                  placeholder={t('messages.topicTag')}
                  style={{ width: '40%' }}
                  value={tagTopicId}
                  onChange={setTagTopicId}
                  showSearch
                  optionFilterProp="label"
                  options={tagTopics.map((tp) => ({ label: tp.title, value: tp.id }))}
                />
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder={t('messages.composePlaceholder')}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send(); }}
                />
              </Space.Compact>
              <div style={{ textAlign: 'right' }}>
                <Button type="primary" loading={sending} onClick={send} disabled={!text.trim()}>{t('messages.send')}</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <RecipientPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onConfirm={startNew} />
    </div>
  );
}
