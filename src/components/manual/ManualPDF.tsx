import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';

export const ManualPDF: React.FC = () => {
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const lineHeight = 7;
    let yPosition = 30;

    // Función auxiliar para añadir texto con salto de página automático
    const addText = (text: string, fontSize = 12, fontStyle: 'normal' | 'bold' = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', fontStyle);
      
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      
      const lines = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(lines, margin, yPosition);
      yPosition += lines.length * lineHeight + 5;
    };

    const addTitle = (text: string, fontSize = 16) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'bold');
      doc.text(text, margin, yPosition);
      yPosition += lineHeight + 10;
    };

    const addSubtitle = (text: string) => {
      addText(text, 14, 'bold');
      yPosition += 5;
    };

    // Portada
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUAL DE USUARIO', pageWidth / 2, 60, { align: 'center' });
    
    doc.setFontSize(20);
    doc.text('Sistema de Substitucións', pageWidth / 2, 80, { align: 'center' });
    doc.text('IES Valle Inclán', pageWidth / 2, 100, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Manual exhaustivo para profesores y administradores', pageWidth / 2, 140, { align: 'center' });
    doc.text(`Generado el: ${new Date().toLocaleDateString('es-ES')}`, pageWidth / 2, 160, { align: 'center' });
    
    doc.addPage();
    yPosition = 30;

    // Índice
    addTitle('ÍNDICE', 18);
    addText('1. INTRODUCCIÓN GENERAL');
    addText('2. GUÍA PARA PROFESORES');
    addText('   2.1 Acceso y autenticación');
    addText('   2.2 Vista del calendario');
    addText('   2.3 Substitucións del día');
    addText('   2.4 Gestión de archivos');
    addText('   2.5 Sistema de colores');
    addText('3. GUÍA PARA ADMINISTRADORES');
    addText('   3.1 Gestión de profesorado');
    addText('   3.2 Gestión de substituciones');
    addText('   3.3 Confirmaciones');
    addText('   3.4 Informes y estadísticas');
    addText('   3.5 Sistema de archivos');
    addText('4. RESOLUCIÓN DE PROBLEMAS');
    addText('5. CONTACTO Y SOPORTE');

    doc.addPage();
    yPosition = 30;

    // 1. INTRODUCCIÓN GENERAL
    addTitle('1. INTRODUCCIÓN GENERAL', 18);
    addText('El Sistema de Substitucions del IES Valle Inclán es una aplicación web diseñada para facilitar la gestión de las substituciones de profesorado de manera eficiente y transparente.');
    
    addSubtitle('Características principales:');
    addText('• Vista de calendario interactivo con todas las substituciones');
    addText('• Sistema de colores para identificar rápidamente el estado de las substituciones');
    addText('• Gestión de archivos y documentos relacionados');
    addText('• Notificaciones automáticas por email');
    addText('• Diferentes niveles de acceso (Profesor/Administrador)');
    addText('• Interfaz responsive para dispositivos móviles y escritorio');
    
    addSubtitle('Tipos de usuario:');
    addText('PROFESOR: Puede ver sus propias substituciones, confirmarlas, y acceder a archivos compartidos.');
    addText('ADMINISTRADOR: Tiene acceso completo al sistema, puede crear profesores, gestionar substituciones, y acceder a informes.');

    // 2. GUÍA PARA PROFESORES
    addTitle('2. GUÍA PARA PROFESORES', 18);
    
    addSubtitle('2.1 Acceso y autenticación');
    addText('Para acceder al sistema, utilice las credenciales proporcionadas por el administrador del centro. Una vez autenticado, verá la interfaz principal con el menú lateral.');
    
    addSubtitle('2.2 Vista del calendario');
    addText('El calendario es la vista principal donde puede ver todas las substituciones:');
    addText('• Sus propias substituciones aparecen destacadas en ROSA/FUCSIA');
    addText('• Las substituciones de otros profesores aparecen en colores más neutros');
    addText('• Puede hacer clic en cualquier día para ver los detalles');
    addText('• Use los controles de navegación para cambiar de mes');
    
    addText('IMPORTANTE: El color rosa/fucsia es exclusivo para identificar SUS substituciones. Esto le permite localizar rápidamente cuándo tiene que cubrir una clase.');
    
    addSubtitle('2.3 Substitucións do día');
    addText('Esta sección muestra únicamente las substituciones del día actual:');
    addText('• Lista detallada de todas las substituciones de hoy');
    addText('• Información completa: hora, materia, grupo, aula');
    addText('• Estado de confirmación de cada substitución');
    addText('• Botones para confirmar su participación');
    
    addSubtitle('2.4 Gestión de archivos');
    addText('En la sección "Arquivos" puede:');
    addText('• Ver todos los archivos subidos al sistema');
    addText('• Subir nuevos documentos relevantes');
    addText('• Descargar archivos existentes');
    addText('• Los archivos están organizados por fecha de subida');
    
    addText('NOTA: Todos los profesores pueden ver todos los archivos subidos, independientemente de quién los haya subido.');
    
    addSubtitle('2.5 Sistema de colores - CLAVE PARA PROFESORES');
    addText('Es fundamental entender el código de colores:');
    addText('• ROSA/FUCSIA: Sus propias substituciones (las que debe cubrir usted)');
    addText('• AZUL/GRIS: Substituciones de otros profesores');
    addText('• VERDE: Substituciones confirmadas');
    addText('• ROJO: Substituciones pendientes o problemáticas');
    
    addText('RECUERDE: Siempre busque el color rosa en el calendario para identificar rápidamente sus responsabilidades.');

    // 3. GUÍA PARA ADMINISTRADORES
    addTitle('3. GUÍA PARA ADMINISTRADORES', 18);
    
    addSubtitle('3.1 Gestión de profesorado');
    addText('Como administrador, puede gestionar todos los profesores del sistema:');
    addText('• Crear nuevos usuarios profesores');
    addText('• Asignar contraseñas temporales');
    addText('• Modificar datos de profesores existentes');
    addText('• Desactivar cuentas cuando sea necesario');
    addText('• Ver la lista completa de profesorado registrado');
    
    addText('Para crear un nuevo profesor:');
    addText('1. Vaya a "Xestionar profesorado"');
    addText('2. Haga clic en "Novo profesor"');
    addText('3. Complete todos los campos obligatorios');
    addText('4. El sistema generará una contraseña temporal');
    addText('5. Comunique las credenciales al nuevo profesor');
    
    addSubtitle('3.2 Gestión de substituciones');
    addText('La gestión de substituciones incluye:');
    addText('• Crear nuevas substituciones');
    addText('• Asignar profesores sustitutos');
    addText('• Modificar substituciones existentes');
    addText('• Cancelar substituciones si es necesario');
    addText('• Envío automático de notificaciones por email');
    
    addText('Proceso para crear una substitución:');
    addText('1. Acceda a "Xestionar substitucións"');
    addText('2. Seleccione la fecha y hora');
    addText('3. Especifique la materia y grupo');
    addText('4. Asigne el profesor sustituto');
    addText('5. Añada observaciones si es necesario');
    addText('6. El sistema enviará notificación automática');
    
    addSubtitle('3.3 Confirmaciones');
    addText('El panel de confirmaciones le permite:');
    addText('• Ver el estado de todas las substituciones');
    addText('• Identificar substituciones sin confirmar');
    addText('• Hacer seguimiento de respuestas de profesores');
    addText('• Generar recordatorios automáticos');
    
    addSubtitle('3.4 Informes y estadísticas');
    addText('Acceda a información valiosa sobre:');
    addText('• Número total de substituciones por período');
    addText('• Profesores más activos en substituciones');
    addText('• Materias con más necesidad de substitución');
    addText('• Estadísticas de confirmación');
    addText('• Tendencias temporales');
    
    addSubtitle('3.5 Sistema de archivos');
    addText('Como administrador, tiene control total sobre archivos:');
    addText('• Ver todos los archivos del sistema');
    addText('• Subir documentos importantes');
    addText('• Organizar archivos por categorías');
    addText('• Eliminar archivos obsoletos');
    addText('• Gestionar permisos de acceso');

    // 4. RESOLUCIÓN DE PROBLEMAS
    addTitle('4. RESOLUCIÓN DE PROBLEMAS', 18);
    
    addSubtitle('Problemas comunes y soluciones:');
    
    addText('No puedo ver mis substituciones:');
    addText('• Verifique que está en la vista de calendario');
    addText('• Busque el color rosa/fucsia que identifica sus substituciones');
    addText('• Compruebe que está en el mes correcto');
    addText('• Si el problema persiste, contacte con el administrador');
    
    addText('No recibo notificaciones por email:');
    addText('• Verifique su dirección de email en el perfil');
    addText('• Revise la carpeta de spam');
    addText('• Confirme que su email está actualizado en el sistema');
    
    addText('No puedo subir archivos:');
    addText('• Verifique el tamaño del archivo (máximo recomendado: 10MB)');
    addText('• Compruebe que el formato es compatible');
    addText('• Asegúrese de tener una conexión estable a internet');
    
    addText('La aplicación es lenta:');
    addText('• Actualice su navegador web');
    addText('• Limpie la caché del navegador');
    addText('• Verifique su conexión a internet');
    addText('• Cierre otras pestañas innecesarias');
    
    addText('Problemas de visualización en móvil:');
    addText('• La aplicación está optimizada para móviles');
    addText('• Use el menú hamburguesa para navegar');
    addText('• Gire el dispositivo si es necesario');
    addText('• Actualice la aplicación si es una PWA');

    // 5. CONTACTO Y SOPORTE
    addTitle('5. CONTACTO Y SOPORTE', 18);
    
    addText('Para cualquier duda, problema técnico o sugerencia de mejora:');
    addText('• Contacte con el administrador del sistema del centro');
    addText('• Envíe un email detallando el problema');
    addText('• Incluya capturas de pantalla si es posible');
    addText('• Especifique el navegador y dispositivo que está usando');
    
    addSubtitle('Consejos para un uso eficiente:');
    addText('• Revise diariamente la sección "Substitucións do día"');
    addText('• Configure notificaciones en su email');
    addText('• Confirme sus substituciones tan pronto como las vea');
    addText('• Mantenga actualizada su información de contacto');
    addText('• Use la sección de ayuda integrada para consultas rápidas');
    
    addText('¡Gracias por usar el Sistema de Substitucións del IES Valle Inclán!');
    
    addText('Documento generado automáticamente por la aplicación.');
    addText(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`);

    // Guardar el PDF
    doc.save('Manual_Sistema_Substitucions_IES_Valle_Inclan.pdf');
  };

  return (
    <Button
      onClick={generatePDF}
      className="w-full justify-start"
      variant="outline"
    >
      <Download className="mr-2 h-4 w-4" />
      Descargar Manual Completo (PDF)
    </Button>
  );
};