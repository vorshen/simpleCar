function Car(params) {
    var self = this;
    var car;
    var mtlLoader = new THREE.MTLLoader();

    this.speed = 0;
    this.rSpeed = 0;
    this.run = false;
    this.acceleration = 0.1;
    this.deceleration = 0.04;
    this.maxSpeed = 2;

    this.light = params.light;

    this.lock = -1;
    this.isBrake = false;

    this.realRotation = 0; // 真实的旋转
    this.dirRotation = 0; // 方向上的旋转
    this.addRotation = 0; // 累计的旋转角度

    this.leftFront = {};

    this.leftBack = {};

    mtlLoader.setPath('./assets/');
    mtlLoader.load('car4.mtl', function(materials) {

        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('./assets/');
        objLoader.load('car4.obj', function(object) {
            car = object;
            car.children.forEach(function(item) {
                item.castShadow = true;
            });
            car.position.z = -20;
            car.position.y = -5;
            
            params.scene.add(car);
            self.car = car;

            params.cb();

        }, function() {
            console.log('progress');
        }, function() {
            console.log('error');
        });
    });

    self.frontRightWheel = new Wheel({
        mtl: 'front_wheel.mtl',
        obj: 'front_wheel.obj',
        parent: car,
        offsetX: 2.79475,
        offsetZ: -3.28386
    });

    self.frontLeftWheel = new Wheel({
        mtl: 'front_wheel.mtl',
        obj: 'front_wheel.obj',
        parent: car,
        offsetX: -2.79475,
        offsetZ: -3.28386
    });
}

Car.prototype.tick = function() {
    if(this.lock > 0) {
        this.lock--;
        if(this.lock % 2) {
            this.car.visible = false;
        } else {
            this.car.visible = true;
        }
        return ;
    }

    if(this.run) {
        this.speed += this.acceleration;
        if(this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
    } else {
        this.speed -= this.deceleration;
        if(this.speed < 0) {
            this.speed = 0;
        }
    }
    var speed = -this.speed;
    if(speed === 0) {
        return ;
    }



    var time = Date.now();

    this.dirRotation += this.rSpeed;
    this.realRotation += this.rSpeed;

    var rotation = this.dirRotation;

    if(this.isBrake) {
        this.realRotation += this.rSpeed * (this.speed / 2);
    } else {
        if(this.realRotation !== this.dirRotation) {
            this.dirRotation += (this.realRotation - this.dirRotation) / 20000 * (this.speed) * (time - this.cancelBrakeTime);
        }
    }

    var speedX = Math.sin(rotation) * speed;
    var speedZ = Math.cos(rotation) * speed;

 
    var tempX = this.car.position.x + speedX;
    var tempZ = this.car.position.z + speedZ;
/* 
this.light.shadow.camera.left = (tempZ-50+20) >> 0;
this.light.shadow.camera.right = (tempZ+50+20) >> 0;
this.light.shadow.camera.top = (tempX+50) >> 0;
this.light.shadow.camera.bottom = (tempX-50) >> 0;
this.light.position.set(-120+tempX, 500, tempZ);
this.light.shadow.camera.updateProjectionMatrix();*/

    this.light.position.set(-10+tempX, 20, tempZ);
    this.light.shadow.camera.updateProjectionMatrix();

    var tempA = -(this.car.rotation.y + 0.523);
    this.leftFront.x = Math.sin(tempA) * 8 + tempX;
    this.leftFront.y = Math.cos(tempA) * 8 + tempZ;

    tempA = -(this.car.rotation.y + 2.616);
    this.leftBack.x = Math.sin(tempA) * 8 + tempX;
    this.leftBack.y = Math.cos(tempA) * 8 + tempZ;

    var collisionSide = this.physical();
    var correctedSpeed;
    if(collisionSide > -1) {
        correctedSpeed = this.collision(speedX, speedZ, collisionSide);

        speedX = correctedSpeed.vx*5;
        speedZ = correctedSpeed.vy*5;

        var angle = Math.atan2(-speedZ, speedX);

        this.realRotation = -1 * (Math.PI / 2 - angle);
        rotation = this.dirRotation = this.realRotation;

        this.speed = 0;
        this.reset();
    }


    this.car.rotation.y = this.realRotation;
    this.frontLeftWheel.wrapper.rotation.y = this.realRotation;
    this.frontRightWheel.wrapper.rotation.y = this.realRotation;
    this.frontLeftWheel.wheel.rotation.y = (this.dirRotation - this.realRotation) / 2;
    this.frontRightWheel.wheel.rotation.y = (this.dirRotation - this.realRotation) / 2;
    

    this.car.position.z += speedZ;
    this.car.position.x += speedX;
    
    this.frontLeftWheel.wrapper.position.z += speedZ;
    this.frontLeftWheel.wrapper.position.x += speedX;
    this.frontRightWheel.wrapper.position.z += speedZ;
    this.frontRightWheel.wrapper.position.x += speedX;

    
    camera.rotation.y = rotation;
    camera.position.x = this.car.position.x + Math.sin(rotation) * 20;
    camera.position.z = this.car.position.z + Math.cos(rotation) * 20;
};

Car.prototype.brake = function() {
    this.v = 10;

    this.isBrake = true;
};

Car.prototype.cancelBrake = function() {
    this.cancelBrakeTime = Date.now();
    this.isBrake = false;
};

Car.prototype.physical = function() {
    var i = 0;

    for(; i < outside.length; i += 4) {
        if(isLineSegmentIntr(this.leftFront, this.leftBack, {
            x: outside[i],
            y: outside[i+1]
        }, {
            x: outside[i+2],
            y: outside[i+3]
        })) {
            return i;
        }
    }

    return -1;
};

Car.prototype.reset = function() {
    this.lock = 60;
};

Car.prototype.collision = function(sx, sz, side) {
    var pos = this.car.position;
    var result = getBounceVector({
        p0: {
            x: pos.x,
            y: pos.z
        },
        p1: {
            x: pos.x + sx,
            y: pos.z + sz
        },
        vx: sx,
        vy: sz
    }, {
        p0: {x: outside[side], y: outside[side+1]},
        p1: {x: outside[side+2], y: outside[side+3]},
        vx: outside[side+2] - outside[side],
        vy: outside[side+3] - outside[side+1]
    });

    return result;
};

function Wheel(params) {
    var mtlLoader = new THREE.MTLLoader();
    var self = this;

    mtlLoader.setPath('./assets/');
    mtlLoader.load(params.mtl, function(materials) {

        materials.preload();
        var objLoader = new THREE.OBJLoader();
        objLoader.setMaterials(materials);
        objLoader.setPath('./assets/');
        objLoader.load(params.obj, function(object) {

            object.children.forEach(function(item) {
                item.castShadow = true;
            });
            var wrapper = new THREE.Object3D();
            wrapper.position.set(0,-5,-20);
            wrapper.add(object);

            object.position.set(params.offsetX, 0, params.offsetZ);

            scene.add(wrapper);
            self.wheel = object;
            self.wrapper = wrapper;

        }, function() {
            console.log('progress');
        }, function() {
            console.log('error');
        });
    });

}

function isLeft(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) < 0;
}

function getBounceVector(obj, w) {
    var len = Math.sqrt(w.vx * w.vx + w.vy * w.vy);
    w.dx = w.vx / len;
    w.dy = w.vy / len;

    w.rx = -w.dy;
    w.ry = w.dx;

    w.lx = w.dy;
    w.ly = -w.dx;

    var projw = getProjectVector(obj, w.dx, w.dy);
    var projn;
    var left = isLeft(w.p0, w.p1, obj.p0);

    if(left) {
        projn = getProjectVector(obj, w.rx, w.ry);
    } else {
        projn = getProjectVector(obj, w.lx, w.ly);
    }
    projn.vx *= -0.5;
    projn.vy *= -0.5;

    return {
        vx: projw.vx + projn.vx,
        vy: projw.vy + projn.vy,
    };
}


function getProjectVector(u, dx, dy) {
    var dp = u.vx * dx + u.vy * dy;

    return {
        vx: (dp * dx),
        vy: (dp * dy)
    };
}

function isLineSegmentIntr(a, b, c, d) {
    // console.log(a, b);
    var area_abc = (a.x - c.x) * (b.y - c.y) - (a.y - c.y) * (b.x - c.x); 

    var area_abd = (a.x - d.x) * (b.y - d.y) - (a.y - d.y) * (b.x - d.x); 

    if(area_abc * area_abd > 0) { 
        return false; 
    }

    var area_cda = (c.x - a.x) * (d.y - a.y) - (c.y - a.y) * (d.x - a.x); 

    var area_cdb = area_cda + area_abc - area_abd ; 
    if(area_cda * area_cdb > 0) { 
        return false; 
    } 

    return true;
}