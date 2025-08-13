import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import EmojiPicker from 'emoji-picker-react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  User,
  Plus,
  Search,
  Circle,
  Smile,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { gl } from 'date-fns/locale';

interface Message {
  id: string;
  contido: string;
  remitente_id: string;
  destinatario_id?: string;
  is_grupo: boolean;
  leido: boolean;
  created_at: string;
  profiles: {
    nome: string;
    apelidos: string;
  } | null;
}

interface Conversation {
  id: string;
  nome?: string;
  is_grupo: boolean;
  participant?: {
    id: string;
    nome: string;
    apelidos: string;
  };
  lastMessage?: string;
  unreadCount: number;
  updated_at: string;
}

interface Profile {
  user_id: string;
  nome: string;
  apelidos: string;
  email: string;
}

interface OnlineUser {
  user_id: string;
  nome: string;
  apelidos: string;
  online_at: string;
}

export const MessagingView: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const { user, userRole, profile } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar conversaciones
  const fetchConversations = async () => {
    try {
      // Buscar conversaciones directas
      const { data: directMessages, error: directError } = await supabase
        .from('mensaxes')
        .select(`
          id,
          remitente_id,
          destinatario_id,
          contido,
          created_at,
          is_grupo,
          leido,
          profiles!mensaxes_remitente_id_fkey (user_id, nome, apelidos)
        `)
        .or(`remitente_id.eq.${user?.id},destinatario_id.eq.${user?.id}`)
        .eq('is_grupo', false)
        .order('created_at', { ascending: false });

      if (directError) {
        console.error('Error fetching direct messages:', directError);
        return;
      }

      // Agrupar por conversación
      const conversationMap = new Map<string, Conversation>();

      directMessages?.forEach((msg) => {
        const otherUserId = msg.remitente_id === user?.id ? msg.destinatario_id : msg.remitente_id;
        if (!otherUserId) return;

        const conversationKey = [user?.id, otherUserId].sort().join('-');
        
        if (!conversationMap.has(conversationKey)) {
          const isFromMe = msg.remitente_id === user?.id;
          const otherUserProfile = !isFromMe ? (msg.profiles as any) : null;
          
          conversationMap.set(conversationKey, {
            id: conversationKey,
            is_grupo: false,
            participant: {
              id: otherUserId,
              nome: isFromMe ? 'Tu' : otherUserProfile?.nome || '',
              apelidos: isFromMe ? '' : otherUserProfile?.apelidos || '',
            },
            lastMessage: msg.contido,
            unreadCount: (!isFromMe && !msg.leido) ? 1 : 0,
            updated_at: msg.created_at,
          });
        } else {
          const existing = conversationMap.get(conversationKey)!;
          if (!msg.leido && msg.destinatario_id === user?.id) {
            existing.unreadCount += 1;
          }
        }
      });

      // Añadir conversación grupal si es necesario
      const { data: groupMessages, error: groupError } = await supabase
        .from('mensaxes')
        .select('id, contido, created_at, leido, remitente_id')
        .eq('is_grupo', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!groupError && groupMessages?.length > 0) {
        const { data: groupUnreadCount } = await supabase
          .from('mensaxes')
          .select('id')
          .eq('is_grupo', true)
          .neq('remitente_id', user?.id)
          .eq('leido', false);

        conversationMap.set('grupo', {
          id: 'grupo',
          nome: 'Chat do claustro',
          is_grupo: true,
          lastMessage: groupMessages[0].contido,
          unreadCount: groupUnreadCount?.length || 0,
          updated_at: groupMessages[0].created_at,
        });
      }

      setConversations(Array.from(conversationMap.values()).sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      ));
    } catch (error) {
      console.error('Error in fetchConversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar mensajes de una conversación
  const fetchMessages = async (conversationId: string) => {
    try {
      if (conversationId === 'grupo') {
        // Mensajes grupales
        const { data, error } = await supabase
          .from('mensaxes')
          .select(`
            id,
            contido,
            remitente_id,
            is_grupo,
            leido,
            created_at,
            profiles!mensaxes_remitente_id_fkey (nome, apelidos)
          `)
          .eq('is_grupo', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching group messages:', error);
          return;
        }

        setMessages((data as any) || []);
      } else {
        // Mensajes directos
        const [userId1, userId2] = conversationId.split('-');
        const { data, error } = await supabase
          .from('mensaxes')
          .select(`
            id,
            contido,
            remitente_id,
            destinatario_id,
            is_grupo,
            leido,
            created_at,
            profiles!mensaxes_remitente_id_fkey (nome, apelidos)
          `)
          .eq('is_grupo', false)
          .or(`and(remitente_id.eq.${userId1},destinatario_id.eq.${userId2}),and(remitente_id.eq.${userId2},destinatario_id.eq.${userId1})`)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Error fetching direct messages:', error);
          return;
        }

        setMessages((data as any) || []);

        // Marcar mensajes como leídos
        await supabase
          .from('mensaxes')
          .update({ leido: true })
          .eq('destinatario_id', user?.id)
          .eq('leido', false)
          .or(`and(remitente_id.eq.${userId1},destinatario_id.eq.${userId2}),and(remitente_id.eq.${userId2},destinatario_id.eq.${userId1})`);
      }
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    }
  };

  // Enviar mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    setSendingMessage(true);
    const messageContent = newMessage.trim();
    setNewMessage(''); // Limpiar inmediatamente para mejor UX

    try {
      console.log('Sending message:', { messageContent, selectedConversation, userId: user?.id });

      if (selectedConversation === 'grupo') {
        // Mensaje grupal
        const { data, error } = await supabase
          .from('mensaxes')
          .insert({
            contido: messageContent,
            remitente_id: user?.id,
            is_grupo: true,
            asunto: 'Chat grupal',
            leido: false
          })
          .select();

        if (error) {
          console.error('Error sending group message:', error);
          setNewMessage(messageContent);
          toast({
            title: "Error",
            description: `Non se puido enviar a mensaxe grupal: ${error.message}`,
            variant: "destructive",
          });
          return;
        }

        console.log('Group message sent successfully:', data);
      } else {
        // Mensaje directo
        const [userId1, userId2] = selectedConversation.split('-');
        const destinatarioId = userId1 === user?.id ? userId2 : userId1;

        console.log('Sending direct message to:', destinatarioId);

        const { data, error } = await supabase
          .from('mensaxes')
          .insert({
            contido: messageContent,
            remitente_id: user?.id,
            destinatario_id: destinatarioId,
            is_grupo: false,
            asunto: 'Mensaxe directa',
            leido: false
          })
          .select();

        if (error) {
          console.error('Error sending direct message:', error);
          setNewMessage(messageContent);
          toast({
            title: "Error",
            description: `Non se puido enviar a mensaxe directa: ${error.message}`,
            variant: "destructive",
          });
          return;
        }

        console.log('Direct message sent successfully:', data);
      }

      // Refresh messages and conversations
      setTimeout(() => {
        if (selectedConversation) {
          fetchMessages(selectedConversation);
        }
        fetchConversations();
      }, 200);

    } catch (error: any) {
      console.error('Error in sendMessage:', error);
      setNewMessage(messageContent);
      toast({
        title: "Error",
        description: `Erro interno ao enviar mensaxe: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Cargar usuarios disponibles (todos los profesores)
  const fetchAvailableUsers = async () => {
    try {
      console.log('Fetching available users...');
      
      // Primero obtener todos los usuarios excepto el actual
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, nome, apelidos, email')
        .neq('user_id', user?.id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      console.log('Profiles found:', profiles);

      // Luego obtener los roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['profesor', 'admin']);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        return;
      }

      console.log('Roles found:', roles);

      // Filtrar solo usuarios que son profesores o administradores
      const teachers = profiles?.filter(profile => 
        roles?.some(role => role.user_id === profile.user_id)
      ) || [];

      console.log('Available teachers:', teachers);
      setAvailableUsers(teachers);
    } catch (error) {
      console.error('Error in fetchAvailableUsers:', error);
    }
  };

  // Iniciar conversación con usuario
  const startConversationWith = async (targetUser: Profile) => {
    const conversationId = [user?.id, targetUser.user_id].sort().join('-');
    setSelectedConversation(conversationId);
    setShowNewChat(false);
    await fetchMessages(conversationId);
  };

  // Verificar si un usuario está en línea
  const isUserOnline = (userId: string) => {
    return onlineUsers.some(onlineUser => onlineUser.user_id === userId);
  };

  // Función para añadir emoji al mensaje
  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Función para iniciar conversación desde el selector
  const handleUserSelect = (userId: string) => {
    if (userId === 'grupo') {
      setSelectedConversation('grupo');
      setSelectedUserId('');
      return;
    }
    
    const targetUser = availableUsers.find(u => u.user_id === userId);
    if (targetUser) {
      startConversationWith(targetUser);
      setSelectedUserId('');
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchAvailableUsers();
  }, [user?.id]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  // Configurar presencia de usuarios en tiempo real
  useEffect(() => {
    if (!user) return;

    const presenceChannel = supabase.channel('online_users')
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineList: OnlineUser[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          presences.forEach((presence: any) => {
            onlineList.push({
              user_id: presence.user_id,
              nome: presence.nome,
              apelidos: presence.apelidos,
              online_at: presence.online_at,
            });
          });
        });
        
        setOnlineUsers(onlineList);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      });

    presenceChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Enviar nuestro estado de presencia con datos del perfil
        await presenceChannel.track({
          user_id: user.id,
          nome: profile?.nome || user.user_metadata?.nome || '',
          apelidos: profile?.apelidos || user.user_metadata?.apelidos || '',
          online_at: new Date().toISOString(),
        });
      }
    });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [user]);

  // Configurar tempo real para mensajes
  useEffect(() => {
    const channel = supabase
      .channel('mensaxes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensaxes'
        },
        (payload) => {
          console.log('New message received:', payload);
          // Actualizar mensajes si estamos en la conversación correcta
          if (selectedConversation) {
            setTimeout(() => {
              fetchMessages(selectedConversation);
            }, 100);
          }
          // Actualizar lista de conversaciones
          setTimeout(() => {
            fetchConversations();
          }, 150);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  const filteredUsers = availableUsers.filter(user =>
    user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apelidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getConversationName = (conversation: Conversation) => {
    if (conversation.is_grupo) {
      return conversation.nome || 'Chat do claustro';
    }
    return `${conversation.participant?.nome} ${conversation.participant?.apelidos}`;
  };

  return (
    <div className="flex h-full bg-background">
      {/* Lista de conversaciones */}
      <div className="w-80 border-r border-border">
        <Card className="h-full rounded-none border-0">
          <CardHeader className="border-b border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <span>Mensaxería</span>
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowNewChat(true)}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Selector desplegable de profesores - separado */}
              <div className="w-full">
                <Select value={selectedUserId} onValueChange={handleUserSelect}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="💬 Seleccionar profesor para conversar" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-lg max-h-60">
                    {/* Chat grupal */}
                    <SelectItem value="grupo" className="hover:bg-accent cursor-pointer">
                      <div className="flex items-center space-x-2 w-full">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium">Chat do claustro</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          Grupal
                        </Badge>
                      </div>
                    </SelectItem>
                    <Separator className="my-1" />
                    {/* Profesores */}
                    {availableUsers.length > 0 ? (
                      availableUsers.map((targetUser) => {
                        const isOnline = isUserOnline(targetUser.user_id);
                        return (
                          <SelectItem 
                            key={targetUser.user_id} 
                            value={targetUser.user_id} 
                            className="hover:bg-accent cursor-pointer"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center space-x-2">
                                <div className="relative">
                                  <User className="h-4 w-4" />
                                  <div className={`absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-background ${
                                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                                  }`} />
                                </div>
                                <span className="font-medium">
                                  {targetUser.nome} {targetUser.apelidos}
                                </span>
                              </div>
                              {isOnline && (
                                <Badge variant="outline" className="text-xs ml-2 text-green-600 border-green-600">
                                  En liña
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-users" disabled>
                        <span className="text-muted-foreground">Non hai profesores dispoñibles</span>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-200px)]">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Cargando conversacións...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Non hai conversacións</p>
                  <p className="text-sm">Comeza unha nova conversación</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          {conversation.is_grupo ? (
                            <Users className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">
                            {getConversationName(conversation)}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="h-5 w-5 text-xs p-0 flex items-center justify-center">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header do chat */}
            <div className="border-b border-border p-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    {selectedConversation === 'grupo' ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">
                    {selectedConversation === 'grupo' 
                      ? 'Chat do claustro' 
                      : conversations.find(c => c.id === selectedConversation)
                        ? getConversationName(conversations.find(c => c.id === selectedConversation)!)
                        : 'Conversación'
                    }
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    {selectedConversation === 'grupo' ? (
                      <>
                        <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                        <span>{onlineUsers.length} usuario{onlineUsers.length !== 1 ? 's' : ''} en liña</span>
                      </>
                    ) : (
                      conversations.find(c => c.id === selectedConversation)?.participant?.id && 
                      isUserOnline(conversations.find(c => c.id === selectedConversation)!.participant!.id) ? (
                        <>
                          <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                          <span>En liña</span>
                        </>
                      ) : (
                        <>
                          <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />
                          <span>Desconectado</span>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mensajes */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isFromMe = message.remitente_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isFromMe 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-accent text-accent-foreground'
                      }`}>
                        {!isFromMe && selectedConversation === 'grupo' && (
                          <p className="text-xs font-medium mb-1">
                            {(message.profiles as any)?.nome} {(message.profiles as any)?.apelidos}
                          </p>
                        )}
                        <p className="text-sm">{message.contido}</p>
                        <p className={`text-xs mt-1 ${
                          isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {format(new Date(message.created_at), 'HH:mm', { locale: gl })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input de mensagem con emojis */}
            <div className="border-t border-border p-4">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Escribe unha mensaxe..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    className="pr-10"
                  />
                </div>
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-auto border-0 shadow-lg">
                    <EmojiPicker onEmojiClick={onEmojiClick} />
                  </PopoverContent>
                </Popover>
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="space-y-4">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-medium text-foreground">
                  Selecciona unha conversación
                </h3>
                <p className="text-muted-foreground">
                  Escolle unha conversación da lista ou comeza unha nova
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal para nova conversación */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <CardTitle>Nova conversación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <ScrollArea className="h-60">
                <div className="space-y-2">
                  {/* Chat grupal */}
                  <div
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => {
                      setSelectedConversation('grupo');
                      setShowNewChat(false);
                    }}
                  >
                    <Avatar>
                      <AvatarFallback>
                        <Users className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">Chat do claustro</p>
                      <p className="text-xs text-muted-foreground">Mensaxe grupal</p>
                    </div>
                  </div>
                  <Separator />
                  {/* Usuarios individuales */}
                  {filteredUsers.map((targetUser) => {
                    const isOnline = isUserOnline(targetUser.user_id);
                    return (
                      <div
                        key={targetUser.user_id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => startConversationWith(targetUser)}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">
                              {targetUser.nome} {targetUser.apelidos}
                            </p>
                            {isOnline && (
                              <Badge variant="secondary" className="text-xs">
                                En liña
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {targetUser.email}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewChat(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};