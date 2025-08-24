import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/gl';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Upload, Download, Trash2, Eye } from 'lucide-react';
import { UploadArquivosDialog } from './UploadArquivosDialog';
import { ArquivosListDialog } from './ArquivosListDialog';
import { useToast } from '@/hooks/use-toast';

moment.locale('gl');
const localizer = momentLocalizer(moment);

interface ArquivoCalendario {
  id: string;
  date: string;
  class_name: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  storage_path: string;
  owner_uid: string;
  owner_name: string;
  notes?: string;
  created_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    date: string;
    fileCount: number;
    files: ArquivoCalendario[];
  };
}

export const ArquivosCalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [selectedDateFiles, setSelectedDateFiles] = useState<ArquivoCalendario[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('month');
  const { toast } = useToast();

  const fetchArquivos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('arquivos_calendario')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching arquivos:', error);
        toast({
          title: "Erro",
          description: "Non se puideron cargar os arquivos",
          variant: "destructive",
        });
        return;
      }

      // Group files by date
      const filesByDate = data.reduce((acc, file) => {
        const dateKey = file.date;
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(file);
        return acc;
      }, {} as Record<string, ArquivoCalendario[]>);

      // Create calendar events
      const calendarEvents = Object.entries(filesByDate).map(([date, files]) => {
        const eventDate = new Date(date);
        return {
          id: date,
          title: `${files.length} arquivo${files.length > 1 ? 's' : ''}`,
          start: eventDate,
          end: eventDate,
          resource: {
            date,
            fileCount: files.length,
            files,
          },
        };
      });

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching arquivos:', error);
      toast({
        title: "Erro",
        description: "Non se puideron cargar os arquivos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArquivos();
  }, []);

  const handleSelectSlot = ({ start }: { start: Date }) => {
    setSelectedDate(start);
    setShowUploadDialog(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDate(new Date(event.resource.date));
    setSelectedDateFiles(event.resource.files);
    setShowListDialog(true);
  };

  const handleUploadSuccess = () => {
    fetchArquivos();
    setShowUploadDialog(false);
    toast({
      title: "Éxito",
      description: "Arquivos subidos correctamente",
    });
  };

  const handleDeleteSuccess = () => {
    fetchArquivos();
    toast({
      title: "Éxito",
      description: "Arquivo eliminado correctamente",
    });
  };

  const eventStyleGetter = () => {
    return {
      style: {
        backgroundColor: 'hsl(var(--primary))',
        borderColor: 'hsl(var(--primary))',
        color: 'hsl(var(--primary-foreground))',
        border: 'none',
        borderRadius: '4px',
      },
    };
  };

  const dayPropGetter = (date: Date) => {
    const today = new Date();
    const isToday = 
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return {
        style: {
          backgroundColor: 'hsl(var(--accent))',
        },
      };
    }
    return {};
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando calendario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Calendario de Arquivos
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Fai clic nun día para subir arquivos ou nun día con material para ver os arquivos dispoñibles.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-96 md:h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={setCurrentView}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              dayPropGetter={dayPropGetter}
              messages={{
                next: "Seguinte",
                previous: "Anterior",
                today: "Hoxe",
                month: "Mes",
                week: "Semana",
                day: "Día",
                agenda: "Axenda",
                date: "Data",
                time: "Hora",
                event: "Evento",
                noEventsInRange: "Non hai arquivos neste período",
                showMore: (total) => `+ ${total} máis`,
              }}
              culture="gl"
              className="h-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <UploadArquivosDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        selectedDate={selectedDate}
        onSuccess={handleUploadSuccess}
      />

      {/* Files List Dialog */}
      <ArquivosListDialog
        open={showListDialog}
        onOpenChange={setShowListDialog}
        selectedDate={selectedDate}
        files={selectedDateFiles}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </div>
  );
};