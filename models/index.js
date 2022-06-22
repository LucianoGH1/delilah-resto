const Platos = require('./platos');
const {Pedidos} = require('./pedidos');
const Usuarios = require('./usuarios');
const PedidosHasPlatos = require('./pedidosHasPlatos');

Usuarios.hasMany(Pedidos, {
    foreignKey: 'usuarios_id'
});

Pedidos.belongsTo(Usuarios, {
    foreignKey: 'usuarios_id'
});

Pedidos.belongsToMany(Platos, {
    through: PedidosHasPlatos
});

module.exports = {
    Usuarios,
    Pedidos,
    Platos,
    PedidosHasPlatos
}