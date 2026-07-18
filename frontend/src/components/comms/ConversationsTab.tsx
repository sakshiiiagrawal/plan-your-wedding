import { useState } from 'react';
import { useConversations } from '../../hooks/useApi';
import { SegmentedControl } from '../ui';
import ComposerDrawer from './ComposerDrawer';
import ConversationList from './ConversationList';
import PollsPanel from './PollsPanel';
import SetupBanner from './SetupBanner';
import TemplatesPanel from './TemplatesPanel';
import ThreadView from './ThreadView';
import type { CommsGuest } from './shared';

type View = 'inbox' | 'polls' | 'templates';

/**
 * Two-pane WhatsApp inbox (conversation list + thread with delivery/read
 * receipts) plus poll management and the template roster. On mobile the panes
 * stack: list first, thread with a back button.
 */
export default function ConversationsTab({ guests }: { guests: CommsGuest[] }) {
  const conversations = useConversations();
  const [view, setView] = useState<View>('inbox');
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [composer, setComposer] = useState<{
    guestIds: string[];
    mode: 'message' | 'poll';
  } | null>(null);

  const rows = conversations.data ?? [];
  const selectedConversation = rows.find((c) => c.guest_id === selectedGuestId) ?? null;
  const unreadCount = rows.filter((c) => c.unread).length;

  return (
    <div className="space-y-4">
      <SetupBanner />

      <SegmentedControl
        value={view}
        onChange={setView}
        options={[
          { value: 'inbox', label: 'Inbox', ...(unreadCount > 0 && { count: unreadCount }) },
          { value: 'polls', label: 'Polls' },
          { value: 'templates', label: 'Templates' },
        ]}
      />

      {view === 'inbox' && (
        <div className="card flex overflow-hidden" style={{ padding: 0, height: 560 }}>
          <div
            className={`${selectedGuestId ? 'hidden md:flex' : 'flex'} w-full flex-col md:w-[300px] md:shrink-0 md:border-r`}
            style={{ borderRightColor: 'var(--line-soft)' }}
          >
            <ConversationList
              conversations={rows}
              loading={conversations.isLoading}
              selectedGuestId={selectedGuestId}
              onSelect={setSelectedGuestId}
            />
          </div>
          <div className={`${selectedGuestId ? 'flex' : 'hidden md:flex'} min-w-0 flex-1`}>
            {selectedConversation ? (
              <ThreadView
                conversation={selectedConversation}
                onBack={() => setSelectedGuestId(null)}
                onSendTemplate={(guestId) =>
                  setComposer({ guestIds: [guestId], mode: 'message' })
                }
              />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8 text-center text-[13px] text-ink-low">
                Select a conversation to see the thread, delivery receipts and replies.
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'polls' && (
        <PollsPanel onNewPoll={() => setComposer({ guestIds: [], mode: 'poll' })} />
      )}

      {view === 'templates' && <TemplatesPanel />}

      <ComposerDrawer
        open={Boolean(composer)}
        onClose={() => setComposer(null)}
        guests={guests}
        initialGuestIds={composer?.guestIds ?? []}
        initialMode={composer?.mode ?? 'message'}
      />
    </div>
  );
}
