import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto} from "src/dto/createUserDto";
import { User } from "src/entities/user.entity";
import { In, Repository } from "typeorm";
import * as bcrypt from "bcrypt"
import { Role } from "src/entities/roles.entity";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { MailService } from "../mail/mail.service";
import { generateRandomPassword } from "src/helpers/password.helper"
import { OrganizationalStructure} from "src/entities/organizationalStructure.entity";
import { CreateUserDtoByAdmin } from "src/dto/createUserByAdminDto";

@Injectable()
export class UserService{
  
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role) 
    private roleRepository: Repository<Role>,
    private readonly mailService: MailService, 
    @InjectRepository(OrganizationalStructure)
    private structureRepository: Repository<OrganizationalStructure>,
  ) {}


  async getUsers(parentId?: string): Promise<User[]> {
    try {
      if (parentId) {
        const parentUser = await this.userRepository.findOne({ where: { id: parentId } });
  
        if (!parentUser) {
          throw new NotFoundException(`User with id ${parentId} not found`);
        }
  // Obtén las relaciones donde este usuario es el padre
        const childRelations = await this.structureRepository.find({
          where: { parent: parentUser }, // Usando la relación
          relations: ['child'], // Carga la relación child
        });

        const childIds = childRelations.map(rel => rel.child.id); 
      
        if (childIds.length > 0) {
          return await this.userRepository.find({
            where: { id: In(childIds) },
            relations: ['roles'], 
          });
        } else {
          return []; 
        }
      }
      return await this.userRepository.find({relations: ['roles']});
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving users');
    }
  }
  
  
  async deteleUserById(id: string):Promise <string> {
    try {
      const userToRemove = await this.userRepository.findOneBy({id})
    if(userToRemove){
      await this.userRepository.remove(userToRemove)
      return `User with id: ${id} successfully deleted`
    }else{
      throw new NotFoundException(`User with id: ${id} not found`)
    }
    } catch (error) {
      throw new InternalServerErrorException('Error deleting user')
    }
    
  }


  async updateUserById(id: string, createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      const userToUpdate = await this.userRepository.findOne({ where: { id } })
      if (!userToUpdate) {
        throw new NotFoundException(`User with id: ${id} not found`)
      }
  
      if (!createUserDto.password) {
        throw new BadRequestException('Password is required for updating user')
      }
  
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10)
  
      let roles
      if (Array.isArray(createUserDto.roles)) {
        roles = createUserDto.roles.map(role => {
          if (typeof role === 'number') {
            return { id: role }  
          }
          return role
        });
      }
  
      const updatedUser = await this.userRepository.save({
        ...userToUpdate,
        ...createUserDto,
        password: hashedPassword,
        roles,  
      });
  
      const { password, ...userToShow } = updatedUser
      return userToShow
    } catch (error) {
      throw new InternalServerErrorException('Error updating user')
    }
  }
  

  async getUserById(id: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id },
        relations: { candidate: true },
      })

      if (!user) {
        throw new NotFoundException(`User with id: ${id} not found`)
      }

      const { password, ...userToShow } = user
      return userToShow
    } catch (error) {
      throw new InternalServerErrorException('Error retrieving user')
    }
  }
 

  async findUserByEmail(email:string):Promise<User>{
      const user = await this.userRepository.findOneBy({ email })
      if (!user) {
        throw new NotFoundException(`User with email: ${email} not found`)
      }
      return user
    } 
  

  async findUserByDni(dni:number):Promise<User>{ 
    const user = await this.userRepository.findOneBy({dni}); 
   if(!user){
    throw new NotFoundException(`user not found`)
   }
   return user;
  }


  async createUser(createUserDto: CreateUserDto, parentId?: string): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOneBy({ dni: createUserDto.dni });
    if (user) {
      throw new UnauthorizedException(`User with dni: ${createUserDto.dni} already exists`);
    }
    const userByEmail = await this.userRepository.findOneBy({ email: createUserDto.email });
    if (userByEmail) {
      throw new UnauthorizedException(`User with email: ${createUserDto.email} already exists`);
    }
    const passwordGenerated = !createUserDto.password;
    const password = createUserDto.password || generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const defaultRole = await this.roleRepository.findOne({ where: { id: 4 } });
    if (!defaultRole) {
      throw new BadRequestException('Default role not found');
    }
    
    let userRoles: Role[] = [defaultRole];
    if (createUserDto.roles && createUserDto.roles.length > 0) {
      userRoles = await this.roleRepository.findBy({ id: In(createUserDto.roles) });
      if (userRoles.length !== createUserDto.roles.length) {
        throw new BadRequestException('Some roles not found');
      }
    }
  

  let newUser = this.userRepository.create({})
    // Enviar emails según si la contraseña fue generada o no
    if (passwordGenerated) {
       // Crear el nuevo usuario
    newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      roles: userRoles,
      isFirstLogin: !passwordGenerated ? false : undefined,
    });
    await this.userRepository.save(newUser);
      await this.mailService.sendPasswordEmail(newUser.email, newUser.name, password);
    } else {
      newUser = this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
        roles: userRoles,
        isFirstLogin: !passwordGenerated ? false : undefined,
      });
      await this.userRepository.save(newUser);
      await this.mailService.sendWelcomeEmail(newUser.email, newUser.name);
    }
    

    if (parentId) {
      const parentUser = await this.userRepository.findOneBy({ id: parentId });
      if (!parentUser) {
        throw new BadRequestException(`Parent user with id: ${parentId} not found`);
      }
  
      const existingRelation = await this.structureRepository.findOne({
        where: { child: { id: newUser.id } },
      });
  
      if (existingRelation) {
        throw new BadRequestException(`User with id: ${newUser.id} is already related to another parent`);
      }
  
      // Crear la relación padre-hijo
      const structureRelation = this.structureRepository.create({
        parent: parentUser,
        child: newUser,
      });
      await this.structureRepository.save(structureRelation);
    }
  
    const { password: excludedPassword, ...result } = newUser;
    return result;
  }
  
  async readExcelFile(filePath: string): Promise<CreateUserDto[]> {
    const data = fs.readFileSync(filePath);
    const workbook = XLSX.read(data, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const users: CreateUserDto[] = [];
  
    sheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<CreateUserDto>(worksheet);
      users.push(...jsonData);
    });
  
    return users;
  }
  
  async importUsers(
    filePath: string, 
    parentId: string
  ): Promise<{ addedUsers: string[], errors: string[] }> {
    if (!filePath) {
      throw new BadRequestException('File not selected');
    }
  
    const users = await this.readExcelFile(filePath);
    const addedUsers: string[] = [];
    const errors: string[] = [];
  
    for (const user of users) {
      // Validar si todos los campos necesarios están presentes
      const missingFields = this.validateUserFields(user);
      if (missingFields.length > 0) {
        errors.push(`Fallo en carga de datos del usuario ${user.email} (Nombre: ${user.name || 'N/A'}, DNI: ${user.dni || 'N/A'}): faltan los siguientes campos: ${missingFields.join(', ')}, registrar manualmente`);
        continue;  // Salta al siguiente usuario
      }
  
      // Verificar si el usuario ya existe
      const existingUser = await this.findUserByEmailxlsx(user.email);
      if (!existingUser) {
        try {
          await this.createUser(user, parentId);
          addedUsers.push(user.email);
        } catch (err) {
          errors.push(`Fallo en la creación del usuario ${user.email}: ${err.message}`);
        }
      } else {
        errors.push(`El usuario ${user.email} (Nombre: ${user.name || 'N/A'}, DNI: ${user.dni || 'N/A'}) ya existe.`);
      }
    }
  
    return {
      addedUsers,
      errors  
    };
  }
  
  
  private validateUserFields(user: CreateUserDto): string[] {
    const missingFields = [];
  
    if (!user.name) missingFields.push('nombre');
    if (!user.dni) missingFields.push('dni');
    if (!user.email) missingFields.push('correo');
  
    return missingFields;
  }
  

  async findUserByEmailxlsx(email: string): Promise<User | undefined> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async createUserByAdmin(createUserDto: CreateUserDtoByAdmin, parentId: string) {
    const user = await this.userRepository.findOneBy({ dni: createUserDto.dni });
    if (user) {
      throw new UnauthorizedException(`User with dni: ${createUserDto.dni} already exists`);
    }
  
    const userByEmail = await this.userRepository.findOneBy({ email: createUserDto.email });
    if (userByEmail) {
      throw new UnauthorizedException(`User with email: ${createUserDto.email} already exists`);
    }
  
    const passwordGenerated = !createUserDto.password;
    const password = createUserDto.password || generateRandomPassword();
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const defaultRole = await this.roleRepository.findOne({ where: { id: 3 } });
    if (!defaultRole) {
      throw new BadRequestException('Default role not found');
    }
  
  
    let userRoles: Role[] = [defaultRole];
    if (createUserDto.roles && createUserDto.roles.length > 0) {
      userRoles = await this.roleRepository.findBy({ id: In(createUserDto.roles) });
      if (userRoles.length !== createUserDto.roles.length) {
        throw new BadRequestException('Some roles not found');
      }
    }

  let newUser = this.userRepository.create({})
    // Enviar emails según si la contraseña fue generada o no

       // Crear el nuevo usuario
    newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
      roles: userRoles,
      isFirstLogin: !passwordGenerated ? false : undefined,
    });
    await this.userRepository.save(newUser);
      await this.mailService.sendPasswordEmail(newUser.email, newUser.name, password);
   
    if (parentId) {
      const parentUser = await this.userRepository.findOneBy({ id: parentId });
      if (!parentUser) {
        throw new BadRequestException(`Parent user with id: ${parentId} not found`);
      }
  
      const existingRelation = await this.structureRepository.findOne({
        where: { child: { id: newUser.id } },
      });
  
      if (existingRelation) {
        throw new BadRequestException(`User with id: ${newUser.id} is already related to another parent`);
      }
  
      // Crear la relación padre-hijo
      const structureRelation = this.structureRepository.create({
        parent: parentUser,
        child: newUser,
      });
      await this.structureRepository.save(structureRelation);
    }
  
    const { password: excludedPassword, ...result } = newUser;
    return result;
  }

}