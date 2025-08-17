import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Mail,
  Settings,
  HelpCircle,
  Info,
  AlertCircle,
  UserPlus,
  PlusCircle
} from 'lucide-react';

export const AxudaView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Axuda e Documentación</h1>
          <p className="text-muted-foreground">
            Guía completa para usar o sistema de substitucións do CEIP Valle Inclán
          </p>
        </div>
      </div>

      <Tabs defaultValue="introduccion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="introduccion">Introdución</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
          <TabsTrigger value="substitucions">Substitucións</TabsTrigger>
          <TabsTrigger value="profesorado">Profesorado</TabsTrigger>
          <TabsTrigger value="problemas">Problemas</TabsTrigger>
          <TabsTrigger value="contacto">Contacto</TabsTrigger>
        </TabsList>

        <TabsContent value="introduccion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Benvido ao Sistema de Substitucións
              </CardTitle>
              <CardDescription>
                Este sistema permite xestionar de forma eficiente as substitucións do profesorado no CEIP Valle Inclán
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Para Profesorado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Ver o calendario de substitucións
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Marcar substitucións como vistas
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Consultar o seu perfil
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Para Administradores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Crear e xestionar substitucións
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Xestionar profesorado
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Ver informes e estatísticas
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Cada profesor ten un número limitado de horas libres semanais. 
                  Isto serve para distribuír equitativamente as substitucións entre todo o profesorado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendario" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Como usar o Calendario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="visualizar">
                  <AccordionTrigger>Visualizar substitucións</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p>O calendario mostra todas as substitucións programadas:</p>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-center gap-2">
                        <Badge variant="secondary">Azul</Badge>
                        Substitucións asignadas a ti
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="outline">Gris</Badge>
                        Substitucións doutros profesores
                      </li>
                      <li className="flex items-center gap-2">
                        <Badge variant="destructive">Vermello</Badge>
                        Substitucións urxentes ou non vistas
                      </li>
                    </ul>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Fai clic nunha substitución para ver todos os detalles e marcar como vista
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="filtros">
                  <AccordionTrigger>Filtros e busca</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      <li>• Podes filtrar por data, profesor ou grupo</li>
                      <li>• Usa a busca rápida para atopar substitucións específicas</li>
                      <li>• As substitucións pasadas móstranse en cor máis suave</li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notificacions">
                  <AccordionTrigger>Notificacións por email</AccordionTrigger>
                  <AccordionContent>
                    <p>Recibirás un email automático cando:</p>
                    <ul className="space-y-2 ml-4">
                      <li>• Te asignen unha nova substitución</li>
                      <li>• Haxa cambios nunha substitución xa asignada</li>
                      <li>• Se cancele unha substitución</li>
                    </ul>
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Asegúrate de que o teu email está actualizado no teu perfil
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="substitucions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Xestión de Substitucións
              </CardTitle>
              <CardDescription>
                Só para administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="crear">
                  <AccordionTrigger>Crear unha nova substitución</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p><strong>Pasos para crear unha substitución:</strong></p>
                    <ol className="space-y-2 ml-4 list-decimal">
                      <li>Fai clic en "Nova Substitución"</li>
                      <li>Selecciona a data e hora</li>
                      <li>Escolle o profesor ausente (opcional)</li>
                      <li>Selecciona o grupo afectado</li>
                      <li>Escolle o motivo da substitución</li>
                      <li>O sistema asignará automaticamente o profesor con máis horas libres</li>
                      <li>Engade observacións se é necesario</li>
                      <li>Garda a substitución</li>
                    </ol>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Asignación automática:</strong> O sistema escolle automaticamente o profesor 
                        que ten máis horas libres dispoñibles na semana.
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="motivos">
                  <AccordionTrigger>Motivos de substitución</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <h4 className="font-semibold mb-2">Motivos principais:</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Enfermidade</li>
                          <li>• Formación</li>
                          <li>• Xestións oficiais</li>
                          <li>• Reunión</li>
                          <li>• Outro (especificar)</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Información adicional:</h4>
                        <ul className="space-y-1 text-sm">
                          <li>• Sesión (1ª, 2ª, 3ª, etc.)</li>
                          <li>• Guardia de transporte se procede</li>
                          <li>• Observacións especiais</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="editar">
                  <AccordionTrigger>Editar ou eliminar substitucións</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p><strong>Para modificar unha substitución:</strong></p>
                    <ul className="space-y-2 ml-4">
                      <li>• Fai clic na substitución no calendario</li>
                      <li>• Selecciona "Editar" no diálogo que aparece</li>
                      <li>• Modifica os campos necesarios</li>
                      <li>• Garda os cambios</li>
                    </ul>
                    
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Se cambias o profesor asignado, o novo profesor recibirá unha notificación por email.
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profesorado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Xestión do Profesorado
              </CardTitle>
              <CardDescription>
                Só para administradores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="anadir">
                  <AccordionTrigger>Engadir novo profesor</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p><strong>Campos obrigatorios:</strong></p>
                    <ul className="space-y-2 ml-4">
                      <li>• <strong>Nome:</strong> Nome do profesor</li>
                      <li>• <strong>Apelidos:</strong> Apelidos completos</li>
                      <li>• <strong>Email:</strong> Correo electrónico (será o usuario de acceso)</li>
                      <li>• <strong>Contrasinal:</strong> Contrasinal inicial (o profesor pode cambialo)</li>
                      <li>• <strong>Teléfono:</strong> Número de contacto (opcional)</li>
                      <li>• <strong>Horas libres semanais:</strong> MUY IMPORTANTE</li>
                    </ul>

                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        <strong>¿Por qué as horas libres semanais?</strong><br/>
                        Este número determina cantas substitucións pode facer cada profesor por semana. 
                        Garante unha distribución equitativa das substitucións entre todo o profesorado.
                        O sistema asigna automaticamente as substitucións ao profesor con máis horas libres dispoñibles.
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="horas-libres">
                  <AccordionTrigger>¿Como calcular as horas libres semanais?</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-semibold mb-2">Cálculo recomendado:</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Profesor a tempo completo:</strong> 5-8 horas libres</li>
                        <li>• <strong>Profesor con media xornada:</strong> 2-4 horas libres</li>
                        <li>• <strong>Especialistas:</strong> 3-6 horas libres</li>
                        <li>• <strong>Equipo directivo:</strong> 1-3 horas libres</li>
                      </ul>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Estas cifras son orientativas. Cada centro debe adaptálas segundo a súa organización 
                      e as necesidades específicas de cada profesor.
                    </p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="contador">
                  <AccordionTrigger>Sistema de contador semanal</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p>O sistema leva un contador automático:</p>
                    <ul className="space-y-2 ml-4">
                      <li>• Cada substitución asignada desconta 1 hora das libres dispoñibles</li>
                      <li>• O contador reiníciase automaticamente cada luns</li>
                      <li>• Podes ver as horas restantes na xestión de profesorado</li>
                      <li>• Se un profesor non ten horas libres, non se lle asignarán substitucións</li>
                    </ul>
                    
                    <Alert>
                      <Settings className="h-4 w-4" />
                      <AlertDescription>
                        Podes reiniciar manualmente o contador se é necesario desde a xestión de profesorado.
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="editar-profesor">
                  <AccordionTrigger>Editar datos do profesorado</AccordionTrigger>
                  <AccordionContent>
                    <p>Para modificar os datos dun profesor:</p>
                    <ol className="space-y-2 ml-4 list-decimal">
                      <li>Vai a "Xestionar profesorado"</li>
                      <li>Busca o profesor na lista</li>
                      <li>Fai clic en "Editar"</li>
                      <li>Modifica os campos necesarios</li>
                      <li>Non esquezas axustar as horas libres se cambia a súa situación</li>
                      <li>Garda os cambios</li>
                    </ol>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problemas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Resolución de Problemas
              </CardTitle>
              <CardDescription>
                Solucións para os problemas máis frecuentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="error-sustitucion">
                  <AccordionTrigger>❌ Erro ao crear substitución</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                      <h4 className="font-semibold text-destructive mb-2">Posibles causas e solucións:</h4>
                      <ul className="space-y-2 text-sm">
                        <li>
                          <strong>Non hai profesores dispoñibles:</strong><br/>
                          Todos os profesores esgotaron as súas horas libres. Verifica na xestión de profesorado 
                          quen ten horas dispoñibles ou reinicia os contadores semanais.
                        </li>
                        <li>
                          <strong>Conflito de horarios:</strong><br/>
                          O profesor seleccionado xa ten unha substitución na mesma hora. 
                          O sistema debería evitar isto, pero podes verificar no calendario.
                        </li>
                        <li>
                          <strong>Campos obrigatorios baleiros:</strong><br/>
                          Revisa que todos os campos marcados con * estean cumprimentados.
                        </li>
                        <li>
                          <strong>Problema de conexión:</strong><br/>
                          Verifica a túa conexión a internet e inténtao de novo.
                        </li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="error-profesor">
                  <AccordionTrigger>❌ Erro ao engadir profesor</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                      <h4 className="font-semibold text-destructive mb-2">Problemas frecuentes:</h4>
                      <ul className="space-y-2 text-sm">
                        <li>
                          <strong>Email xa existe:</strong><br/>
                          Ese correo electrónico xa está rexistrado no sistema. 
                          Cada profesor debe ter un email único.
                        </li>
                        <li>
                          <strong>Contrasinal moi simple:</strong><br/>
                          O contrasinal debe ter polo menos 6 caracteres.
                        </li>
                        <li>
                          <strong>Formato de email incorrecto:</strong><br/>
                          Asegúrate de que o email ten o formato correcto (exemplo@dominio.com).
                        </li>
                        <li>
                          <strong>Horas libres non válidas:</strong><br/>
                          Debe ser un número entre 0 e 40.
                        </li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="email-non-chega">
                  <AccordionTrigger>📧 Non chegan os emails de notificación</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <h4 className="font-semibold mb-2">Que comprobar:</h4>
                    <ul className="space-y-2 text-sm">
                      <li>• Revisa a carpeta de spam/correo non desexado</li>
                      <li>• Verifica que o email no perfil do profesor está correcto</li>
                      <li>• Alguns servidores de correo poden bloquear emails automáticos</li>
                      <li>• Contacta co administrador do sistema se persiste o problema</li>
                    </ul>
                    
                    <Alert>
                      <Mail className="h-4 w-4" />
                      <AlertDescription>
                        Os emails de notificación poden tardar uns minutos en chegar. 
                        Se tras 10 minutos non chegou, revisa os puntos anteriores.
                      </AlertDescription>
                    </Alert>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="non-podo-acceder">
                  <AccordionTrigger>🔐 Non podo acceder ao sistema</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">Problemas de acceso:</h4>
                        <ul className="space-y-2 text-sm">
                          <li>• Verifica que estás usando o email correcto (non o nome de usuario)</li>
                          <li>• Asegúrate de que o contrasinal é correcto</li>
                          <li>• Proba a restablecer o contrasinal</li>
                          <li>• Limpa a caché do navegador</li>
                          <li>• Proba con outro navegador</li>
                        </ul>
                      </div>
                      
                      <Alert>
                        <HelpCircle className="h-4 w-4" />
                        <AlertDescription>
                          Se continúas tendo problemas, contacta co administrador do sistema. 
                          Proporciona o teu email e unha descrición do erro que aparece.
                        </AlertDescription>
                      </Alert>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="lento">
                  <AccordionTrigger>🐌 O sistema vai lento</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      <h4 className="font-semibold mb-2">Optimizacións:</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• Usa un navegador actualizado (Chrome, Firefox, Safari)</li>
                        <li>• Limpa a caché e cookies do navegador</li>
                        <li>• Desactiva extensións innecesarias do navegador</li>
                        <li>• Verifica a túa conexión a internet</li>
                        <li>• Evita ter moitas pestanas abertas ao mesmo tempo</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacto" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Soporte e Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Administrador do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>Para problemas técnicos:</strong></p>
                      <ul className="space-y-1 ml-4">
                        <li>• Erros no sistema</li>
                        <li>• Problemas de acceso</li>
                        <li>• Configuración de contas</li>
                        <li>• Preguntas sobre funcionamento</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Equipo Directivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>Para temas organizativos:</strong></p>
                      <ul className="space-y-1 ml-4">
                        <li>• Asignación de horas libres</li>
                        <li>• Política de substitucións</li>
                        <li>• Cambios organizativos</li>
                        <li>• Consultas pedagóxicas</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Consello:</strong> Antes de contactar, revisa esta guía de axuda. 
                  A maioría de problemas teñen solución rápida seguindo estes pasos.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Información útil para reportar problemas:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Que estabas intentando facer cando ocorreu o erro</li>
                  <li>• Mensaxe de erro exacta (se aparece algúa)</li>
                  <li>• Navegador que estás usando</li>
                  <li>• Se o problema ocorre sempre ou só ás veces</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};