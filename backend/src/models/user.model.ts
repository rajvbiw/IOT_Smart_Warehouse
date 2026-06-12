import { DataTypes, Model, Sequelize } from 'sequelize';
import bcrypt from 'bcryptjs';

export class User extends Model {
  public id!: number;
  public name!: string;
  public email!: string;
  public password_hash!: string;
  public role!: 'superadmin' | 'warehouse_manager' | 'operator' | 'viewer';
  public warehouse_id!: number | null;
  public is_active!: boolean;
  public last_login!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public warehouse?: any;

  public async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password_hash);
  }
}

export function initUser(sequelize: Sequelize): typeof User {
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      password_hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM('superadmin', 'warehouse_manager', 'operator', 'viewer'),
        allowNull: false,
        defaultValue: 'viewer',
      },
      warehouse_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'users',
      underscored: true,
      timestamps: true,
      hooks: {
        beforeSave: async (user: User) => {
          if (user.changed('password_hash') || (user.isNewRecord && user.password_hash && !user.password_hash.startsWith('$2a$'))) {
            const salt = await bcrypt.genSalt(10);
            user.password_hash = await bcrypt.hash(user.password_hash, salt);
          }
        },
      },
    }
  );
  return User;
}
