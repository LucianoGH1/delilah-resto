const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');

const Platos = sequelize.define('platos', {
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    precio: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    imagen: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName: 'platos',
    underscored: true
});
module.exports = Platos;