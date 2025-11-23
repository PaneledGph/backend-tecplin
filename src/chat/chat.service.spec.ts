import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ChatService', () => {
  let service: ChatService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: {
            conversacion: {
              findFirst: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            mensaje: {
              create: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn(),
              count: jest.fn(),
            },
            usuario: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should return existing conversation if found', async () => {
      const mockConversation = {
        id: 1,
        usuario1Id: 1,
        usuario2Id: 2,
      };

      jest
        .spyOn(prismaService.conversacion, 'findFirst')
        .mockResolvedValue(mockConversation as any);

      const result = await service.createConversation(1, 2);

      expect(result).toEqual(mockConversation);
      expect(prismaService.conversacion.findFirst).toHaveBeenCalled();
    });

    it('should create new conversation if not found', async () => {
      const mockConversation = {
        id: 1,
        usuario1Id: 1,
        usuario2Id: 2,
      };

      jest
        .spyOn(prismaService.conversacion, 'findFirst')
        .mockResolvedValue(null);
      jest
        .spyOn(prismaService.conversacion, 'create')
        .mockResolvedValue(mockConversation as any);

      const result = await service.createConversation(1, 2);

      expect(result).toEqual(mockConversation);
      expect(prismaService.conversacion.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should create and return a message', async () => {
      const mockMessage = {
        id: 1,
        conversacionId: 1,
        remitenteId: 1,
        contenido: 'Test message',
      };

      jest
        .spyOn(prismaService.mensaje, 'create')
        .mockResolvedValue(mockMessage as any);
      jest
        .spyOn(prismaService.conversacion, 'update')
        .mockResolvedValue({} as any);

      const result = await service.sendMessage(1, 1, 'Test message');

      expect(result).toEqual(mockMessage);
      expect(prismaService.mensaje.create).toHaveBeenCalled();
      expect(prismaService.conversacion.update).toHaveBeenCalled();
    });
  });

  describe('getAvailableStaff', () => {
    it('should return list of technicians and admins', async () => {
      const mockStaff = [
        { id: 1, usuario: 'admin', rol: 'ADMIN' },
        { id: 2, usuario: 'tecnico1', rol: 'TECNICO' },
      ];

      jest
        .spyOn(prismaService.usuario, 'findMany')
        .mockResolvedValue(mockStaff as any);

      const result = await service.getAvailableStaff();

      expect(result).toEqual(mockStaff);
      expect(prismaService.usuario.findMany).toHaveBeenCalled();
    });
  });
});
