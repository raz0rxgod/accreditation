import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { QrSignerModule } from './common/qr/qr-signer.module';
import { AuthModule } from './modules/auth/auth.module';
import { StaffModule } from './modules/staff/staff.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { ApplicantsModule } from './modules/applicants/applicants.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { StatusModule } from './modules/status/status.module';
import { ChatModule } from './modules/chat/chat.module';
import { CardsModule } from './modules/cards/cards.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationsInboxModule } from './modules/notifications-inbox/notifications-inbox.module';
import { QrModule } from './modules/qr/qr.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ReferenceModule } from './modules/reference/reference.module';
import { PrintPackModule } from './modules/print-pack/print-pack.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    QrSignerModule,
    AuthModule,
    StaffModule,
    ApplicationsModule,
    ApplicantsModule,
    DocumentsModule,
    StatusModule,
    ChatModule,
    CardsModule,
    EquipmentModule,
    MaterialsModule,
    NotificationsModule,
    NotificationsInboxModule,
    QrModule,
    AnalyticsModule,
    ReferenceModule,
    PrintPackModule,
  ],
})
export class AppModule {}
