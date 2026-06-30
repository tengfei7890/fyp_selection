import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  List,
  Badge,
  Input,
  Select,
  Empty,
  Tag,
  Space,
  Spin,
  message,
} from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { messageApi, topicApi } from '@/api';
import type { Conversation, MessageItem, Topic } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Role, RoleLabels } from '@shared/enums';
import RecipientPickerModal from '@/components/RecipientPickerModal';

interface Partner {
  id: number;
  name: string;
}

export default function Messages() {
  const { user } = useAuth();
  const isStudent = user!.role === Role.STUDENT;
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
    try {
      setConversations(await messageApi.conversations());
    } catch {
      /* ignore poll errors */
    }
  }, []);

  const loadThread = useCallback(
    async (pid: number) => {
      setLoadingThread(true);
      try {
        setThread(await messageApi.thread(pid));
        await loadConversations();
      } catch (err) {
        message.error((err as Error).message);
      } finally {
        setLoadingThread(false);
      }
    },
    [loadConversations],
  );

  // 初始化：会话列表 + URL 参数（来自"联系教师/学生"入口）
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

  // 轻量轮询（消息页 10s）；后续可升级为 WebSocket 推送
  useEffect(() => {
    const id = setInterval(() => {
      loadConversations();
      if (partner) {
        messageApi
          .thread(partner.id)
          .then(setThread)
          .catch(() => undefined);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [partner, loadConversations]);

  // 切换对话对象时加载"相关课题"标签候选
  useEffect(() => {
    if (!partner) {
      setTagTopics([]);
      return;
    }
    (async () => {
      try {
        const res = await topicApi.list({ page: 1, pageSize: 100 });
        const items: Topic[] = res.items;
        const list = isStudent
          ? items.filter((t) => t.teacherId === partner.id)
          : items;
        setTagTopics(list.map((t) => ({ id: t.id, title: t.title })));
      } catch {
        /* ignore */
      }
    })();
  }, [partner, isStudent]);

  // 新消息时滚到底
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
      const m = await messageApi.send({
        receiverId: partner.id,
        content: text.trim(),
        topicId: tagTopicId,
      });
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
      {/* 左：会话列表 */}
      <Card
        title="会话"
        size="small"
        style={{ width: 320, flexShrink: 0 }}
        extra={
          <Space size="small">
            <Button size="small" icon={<ReloadOutlined />} onClick={loadConversations} />
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setPickerOpen(true)}>
              新对话
            </Button>
          </Space>
        }
      >
        <List
          dataSource={conversations}
          locale={{ emptyText: <Empty description="暂无会话" /> }}
          renderItem={(c) => (
            <List.Item
              onClick={() => selectConversation(c)}
              style={{
                cursor: 'pointer',
                background: partner?.id === c.partner.id ? '#e6f4ff' : undefined,
                padding: '8px 12px',
                borderRadius: 6,
              }}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <span>{c.partner.name}</span>
                    <Tag>{RoleLabels[c.partner.role as Role]}</Tag>
                    {c.unread > 0 && <Badge count={c.unread} />}
                  </Space>
                }
                description={
                  <span style={{ color: '#888' }}>
                    {(c.lastMessage?.senderId === user!.id ? '我：' : '')}
                    {c.lastMessage?.content?.slice(0, 24) ?? ''}
                  </span>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 右：对话详情 */}
      <Card
        size="small"
        style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        title={partner ? `与 ${partner.name || '对方'} 的对话` : '请选择左侧会话或发起新对话'}
      >
        {!partner ? (
          <Empty style={{ margin: 'auto' }} description="选择一个会话开始沟通" />
        ) : (
          <>
            <Spin spinning={loadingThread}>
              <div style={{ flex: 1, overflow: 'auto', padding: 8, minHeight: 280 }}>
                {thread.length === 0 ? (
                  <Empty description="还没有消息，发一条打个招呼吧" style={{ marginTop: 60 }} />
                ) : (
                  thread.map((m) => {
                    const mine = m.senderId === user!.id;
                    return (
                      <div
                        key={m.id}
                        style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 8 }}
                      >
                        <div
                          style={{
                            maxWidth: '70%',
                            background: mine ? '#1677ff' : '#f0f0f0',
                            color: mine ? '#fff' : '#333',
                            padding: '8px 12px',
                            borderRadius: 8,
                          }}
                        >
                          {m.topic?.title && (
                            <div style={{ marginBottom: 4 }}>
                              <Tag color={mine ? 'blue-inverse' : 'blue'} style={{ margin: 0 }}>
                                课题：{m.topic.title}
                              </Tag>
                            </div>
                          )}
                          <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, textAlign: mine ? 'right' : 'left' }}>
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
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
                  placeholder="相关课题（可选标签）"
                  style={{ width: '40%' }}
                  value={tagTopicId}
                  onChange={setTagTopicId}
                  showSearch
                  optionFilterProp="label"
                  options={tagTopics.map((t) => ({ label: t.title, value: t.id }))}
                />
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder="输入消息，Ctrl/⌘+Enter 发送"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') send();
                  }}
                />
              </Space.Compact>
              <div style={{ textAlign: 'right' }}>
                <Button type="primary" loading={sending} onClick={send} disabled={!text.trim()}>
                  发送
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <RecipientPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onConfirm={startNew}
      />
    </div>
  );
}
