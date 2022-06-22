const {DataTypes} = require('sequelize');
const sequelize = require('../config/db');
const Pedidos = require('./pedidos');
const Platos = require('./platos');

const PedidosHasPlatos = sequelize.define('pedidos_has_platos', {
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull:false
    },
    pedido_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'pedido_id',
        references: {
            model: Pedidos,
            key: 'id'
        }
    },
    plato_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'plato_id',
        references: {
            model: Platos,
            key: 'id'
        }
    }
},
{
    tableName: 'pedidos_has_platos',
    underscored: true,
    timestamps: false
}
);

module.exports = PedidosHasPlatos;