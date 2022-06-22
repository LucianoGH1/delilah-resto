//Importar librerias
const compression = require('compression');
const express = require('express');
const jwt = require('jsonwebtoken');
const expressJwt = require('express-jwt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const {estados} = require('./models/pedidos');


//Puerto del servidor
const SERVER_PORT = process.env.SERVER_PORT;

//JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

//Importar modelos
const {
    Usuarios,
    Pedidos,
    Platos,
    PedidosHasPlatos
} = require('./models/index');
const { json } = require('express/lib/response');


//Crear instancia del server con express
const server = express();

//Limitar peticiones
const limiter = rateLimit({
    windowMS: 10*1000,
    max: 10,
    message: 'Exediste el limite de peticiones'
});

//Logger
const logger = (req, res, next) => {
    const path = req.path;
    const method = req.method;
    const body = req.body

    process.nextTick(() => {
        console.log(`
        Metodo: ${method}
        Ruta: ${path}
        Body: ${JSON.stringify(body)}
        Params: ${JSON.stringify(req.params)}
        `)
    });

    next();
}

//Middlewares globales
server.use(express.json());
server.use(compression());
server.use(helmet());
server.use(limiter);
server.use(logger);
server.use(cors())
//Jwt
server.use(expressJwt({
    secret: JWT_SECRET,
    algorithms: ["HS256"]
}).unless({path: ['/signIn', '/logIn']}))

//MIDDLEWARES
//Validacion Sign-In
const signInValidation = async (req, res, next) => {
    const posibleUsuario = {usuario, correo} = req.body;
    const usuarioEnDb = await Usuarios.findOne({where: {usuario: posibleUsuario.usuario}});
    const correoEnDb = await Usuarios.findOne({where: {correo: posibleUsuario.correo}});
    console.log(usuarioEnDb, correoEnDb)
    if (usuarioEnDb != null) {
        res.status(400).json({error: 'usuario ya existe'});
    } else if (correoEnDb != null) {
        res.status(400).json({error: 'correo ya existe'});        
    } else {
        next();        
    }
};

//Verificar si plato existe
const verificarPlato = async (req, res, next) => {
    const posiblePlato = await Platos.findOne({where: {nombre: req.body.nombre}});
    console.log(posiblePlato)
    if (posiblePlato === null) {
        next();
    } else {
        res.status(400).json({error: 'Este plato ya existe'});
    }
};

const verificarAdmin = async (req, res, next) => {
    const userId = req.user.id;
    if (await Usuarios.findOne({where: {id: userId, esAdmin: true}}) === null) {
        res.status(400).json({error: 'Usuario no es admin, acceso denegado'})
    } else {
        console.log('Es admin!');
        next();
    }
}


//RUTAS
//Sign in
server.post('/signIn', signInValidation, (req, res) => {
    console.log('paso el middleware')
    const nuevoUsuario = {nombre, usuario, telefono, direccion, correo, contrasena} = req.body;
    Usuarios.create(nuevoUsuario).then(() => {
        res.status(201).json(nuevoUsuario);
    }).catch((err) => {
        res.status(400).json({error: err.message});
    })
});

//Login
server.post('/logIn', limiter, async (req, res) => {
    const {usuario, contrasena} = req.body;
    const posibleUsuario = await Usuarios.findOne({
        where: {usuario: usuario, contrasena: contrasena}});
    try {
        if (posibleUsuario != null) {
            const token = jwt.sign(
                {id: posibleUsuario.id},
                JWT_SECRET,
                {expiresIn: "24h"}
            );
            res.status(200).json(token);
        } else {
            res.status(404).json({error: 'Usuario o contraseña incorrecto'})
        }
    } catch (error) {
        res.status(400).json({error: error.message})
    }
})

//Obtener todos los platos
server.get('/platos', async (req, res) => {
    const platos = await Platos.findAll({
        attributes: ['id', 'imagen', 'nombre', 'precio', 'active' ]
    });
    
    res.json(platos).status(200);
});

//Obtener plato por id
server.get('/plato/:id', async (req, res) => {
    const idParam = req.params.id;
    const plato = await Platos.findOne({
        attributes: ['id', 'imagen', 'nombre', 'precio'],
        where: {id: idParam}
    });

    plato ? res.json(plato) : res.status(400).json({error: `Plato con id ${idParam} no existe`});
});


//Nuevo plato
server.post('/nuevoPlato', verificarPlato,  (req, res) => {
    const nuevoPlato = {nombre, precio, imagen} = req.body;
    console.log(nuevoPlato);
    Platos.create(nuevoPlato).then(() => {
        res.status(201).json(nuevoPlato);
    }).catch((err) => {
        res.status(400).json({error: err.message});
    });
});

//Desactivar plato
server.put("/desactivarPlato/:id", async(req,res)=>{
    const idPlato = req.params.id;
    try {
        const plato = await Platos.findOne({where: {id: idPlato}})
        if (!plato) {
            res.status(404).json({error: `El plato con id ${idPlato} no existe`})
        } else {
           await Platos.update({active: false}, {where: {id: idPlato}});
           res.status(200).json('Plato desactivado')
        }
        
    } catch (error) {
        res.json({error: error.message})
    }
});

//Modificar plato
server.put('/plato/:id', async (req, res) => {
    const id = req.params.id;
    const {nombre, imagen, precio} = req.body;
    try {
        await Platos.update({nombre: nombre, imagen: imagen, precio: precio}, {where: {id: id}});
        const plato = await Platos.findOne({where: {id: id}});
        res.status(201).json(plato)
    } catch (error) {
        res.status(400).json({error: error.message});
    }

})

//Obtener todos los pedidos
server.get('/pedidos', async (req, res) => {
    const pedidos = await Pedidos.findAll({
        attributes: ['id', 'precio_total', 'forma_pago'], 
        include: [
            {model: Usuarios, attributes: ['id', 'usuario', 'correo', 'direccion']},
            {model: Platos, attributes: ['id', 'nombre', 'precio', 'imagen']}]         
    });
    res.status(200).json(pedidos);

});

//Obtener pedido por id
server.get('/pedido/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const pedido = await Pedidos.findOne({
            where: {id: id},
            include: [
                {model: Usuarios, attributes: ['id', 'usuario', 'correo', 'direccion']},
                {model: Platos, attributes: ['id', 'nombre', 'precio']}]
        });   
        res.status(200).json(pedido)
        
    } catch (error) {
        res.status(404).json({error: error.message})      
    }
})

//Cambiar estado del pedido
server.put('/cambiarEstadoPedido/:id', async (req, res) => {
    const id = req.params.id;
    const nuevoEstado = req.body.estado;
    const pedido = await Pedidos.findOne({where: {id: id}});
    try {
        if(pedido  === null) {
            res.status(404).json({error: `Pedido con id ${id} inexistente`});
        } else if (estados.find((e) => e === req.body.estado) != undefined){
            await Pedidos.update({estado: nuevoEstado}, {where: {id: id}});
            const pedidoActualizado = await Pedidos.findOne({where: {id: id}});
            res.status(200).json(pedidoActualizado);
            
        } else {
            res.status(400).json({error: 'Estado no valido'})
        }
        
    } catch (error) {
        res.status(400).json({error: error.message})        
    }


});

//Obtener todos los usuarios
server.get('/usuarios', verificarAdmin, async (req, res) => {
    const usuarios = await Usuarios.findAll({
        attributes: ['usuario', 'nombre', 'direccion', 'esAdmin'],
        include: {model: Pedidos, attributes: ['id', 'precio_total', 'estado']}
    });
    if (usuarios === null) {
        res.status(404).json({msg: 'No hay usuarios registrados'})
    } else {
        res.status(200).json(usuarios);

    }
});

//Obtener pedidos de usuario logeado
server.get('/misPedidos', async (req, res) => {
    const userId = req.user.id;
    const misPedidos = await Pedidos.findAll({
        where: {usuarios_id: userId},
        include: {model: Platos, attributes: ['nombre', 'precio']},
        attributes: ['id', 'precio_total', 'estado', 'forma_pago']
    })
    
    res.status(200).json(misPedidos);
    
});

//Borrar pedido de usuario logeado
server.delete('/misPedidos/:id', async (req, res) => {
    try {
        const userId = req.user.id;
        const pedidoId = req.params.id;
        const pedido = await Pedidos.findOne({
            where: {
                id: pedidoId,
                usuarios_id: userId
            }
        });
        if (pedido != null) {
            await PedidosHasPlatos.destroy({
                where: {
                    pedido_id: pedidoId
                }
            });
            await Pedidos.destroy({
                where: {
                    id: pedidoId
                }
            });

            res.status(200).json({
                msg: 'Pedido eliminado'
            })
        } else {
            res.status(404).json({
                error: 'Pedido no encontrado'
            })
        }
        
    } catch (error) {
        res.status(400).json(error.message);
    }
})

//Borrar pedido
server.delete('/pedidos/:id', verificarAdmin, async (req, res) => {
    const pedidoId = req.params.id;

    try {
        if (await Pedidos.findOne({where: {id: pedidoId}}) === null) {
            res.status(404).json({msg: 'pedido no encontrado'});
        } else {
            await PedidosHasPlatos.destroy({
                where: {pedido_id: pedidoId}
            });               
            await Pedidos.destroy({
                where: {id: pedidoId}
            });
        }
        res.status(200).json({msg: `Pedido con id ${pedidoId} eliminado`});     
    } catch (error) {
        res.status(400).json(error.message)
    }

});

//Crear pedido
server.post('/pedidos', async (req, res) => {
    try {
        const {forma_pago, platos} = req.body;
        const dataPlatos = await Promise.all(
            platos.map(async (plato)=>{
            const platoDB = await Platos.findOne({
                where: {
                    id: plato.platoId,
                }
            });
        
            return {
                id: plato.platoId,
                cantidad: plato.cantidad,
                precio: platoDB.precio,
            };
        }))

        const precio_total = dataPlatos.reduce((acc, dataPlato)=>{
            return (acc + dataPlato.precio * dataPlato.cantidad)
        }, 0); 

        const nuevoPedido = await Pedidos.create({
            precio_total,
            forma_pago,
            usuarios_id: req.user.id,
        });

        await Promise.all(
            dataPlatos.map(async (plato) => {
            await PedidosHasPlatos.create(
                {
                    cantidad: plato.cantidad,
                    plato_id: plato.id,
                    pedido_id: nuevoPedido.id,
                },
                {
                    fields: ["cantidad", "plato_id", "pedido_id"],
                }
            );
        }));
        res.status(201).json(nuevoPedido);
    
        
        
    } catch (error) {
        res.json(error.message)
    }
});

//Modificar pedido
server.put("/pedidos/:id", verificarAdmin, async (req,res) =>{
    const idParam = req.params.id;
    const {precio_total, forma_pago} = req.body;

    const posiblePedido= await Pedidos.findOne({
        where: {
            id:idParam,
        }
    })

    if(!posiblePedido){
        res.status(404).json({
            error: `No existe pedido con id ${idParam}`
        });
    }else{  
        await Pedidos.update(
            {
                precio_total,
                forma_pago,
            },
            {where:{
                id: idParam,
            }
        });
        res.status(201).json(`El pedido ${idParam} ha sido modificado.`);
    }
});

//Levantar servidor
server.listen(SERVER_PORT, () => {
    console.log(`Servidor iniciado en el puerto ${SERVER_PORT}`)
})
