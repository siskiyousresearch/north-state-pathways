import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, User, Bot, ChevronRight, MapPin } from "lucide-react";
import type { ChatSession, ChatMessage } from "@shared/schema";

export default function ConversationsPage() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useQuery<ChatSession[]>({
    queryKey: ["/api/admin/sessions"],
  });

  const { data: sessionMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/admin/sessions", selectedSession, "messages"],
    enabled: !!selectedSession,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-conversations-title">Conversations</h1>
        <p className="text-muted-foreground text-sm mt-1">Review student chat sessions and interactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          <Card className="p-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Sessions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{sessions?.length ?? 0} total</p>
            </div>
            <ScrollArea className="h-[500px]">
              {sessionsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : sessions && sessions.length > 0 ? (
                <div className="divide-y">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSession(session.id)}
                      className={`w-full p-3.5 text-left hover-elevate transition-colors ${
                        selectedSession === session.id ? "bg-accent" : ""
                      }`}
                      data-testid={`button-session-${session.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-8 h-8 shrink-0">
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              <User className="w-3.5 h-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {session.userType || "Unknown"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {session.county && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" /> {session.county}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {new Date(session.createdAt).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No sessions yet</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Messages</h3>
              {selectedSession && (
                <p className="text-xs text-muted-foreground mt-0.5">Session #{selectedSession}</p>
              )}
            </div>
            <ScrollArea className="h-[500px]">
              {!selectedSession ? (
                <div className="p-12 text-center">
                  <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a session to view messages</p>
                </div>
              ) : messagesLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-3/4" />
                  ))}
                </div>
              ) : sessionMessages && sessionMessages.length > 0 ? (
                <div className="p-4 space-y-4">
                  {sessionMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      data-testid={`admin-message-${msg.id}`}
                    >
                      {msg.role === "assistant" && (
                        <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                            <Bot className="w-3.5 h-3.5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[75%] rounded-md px-3 py-2 text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.role === "assistant" ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ul]:ml-1 [&>ul>li]:mb-1 [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2">
                            <ReactMarkdown
                              components={{
                                a: ({ href, children }) => (
                                  <a href={href} target="_blank" rel="noopener noreferrer" data-testid="link-admin-chat-external">
                                    {children}
                                  </a>
                                ),
                              }}
                            >{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm text-muted-foreground">No messages in this session</p>
                </div>
              )}
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
