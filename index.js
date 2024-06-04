import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

function mergeVertices( geometry, tolerance = 1e-4 ) {

	tolerance = Math.max( tolerance, Number.EPSILON );

	// Generate an index buffer if the geometry doesn't have one, or optimize it
	// if it's already available.
	const hashToIndex = {};
	const indices = geometry.getIndex();
	const positions = geometry.getAttribute( 'position' );
	const vertexCount = indices ? indices.count : positions.count;

	// next value for triangle indices
	let nextIndex = 0;

	// attributes and new attribute arrays
	const attributeNames = Object.keys( geometry.attributes );
	const tmpAttributes = {};
	const tmpMorphAttributes = {};
	const newIndices = [];
	const getters = [ 'getX', 'getY', 'getZ', 'getW' ];
	const setters = [ 'setX', 'setY', 'setZ', 'setW' ];

	// Initialize the arrays, allocating space conservatively. Extra
	// space will be trimmed in the last step.
	for ( let i = 0, l = attributeNames.length; i < l; i ++ ) {

		const name = attributeNames[ i ];
		const attr = geometry.attributes[ name ];

		tmpAttributes[ name ] = new THREE.BufferAttribute(
			new attr.array.constructor( attr.count * attr.itemSize ),
			attr.itemSize,
			attr.normalized
		);

		const morphAttr = geometry.morphAttributes[ name ];
		if ( morphAttr ) {

			tmpMorphAttributes[ name ] = new THREE.BufferAttribute(
				new morphAttr.array.constructor( morphAttr.count * morphAttr.itemSize ),
				morphAttr.itemSize,
				morphAttr.normalized
			);

		}

	}

	// convert the error tolerance to an amount of decimal places to truncate to
	const halfTolerance = tolerance * 0.5;
	const exponent = Math.log10( 1 / tolerance );
	const hashMultiplier = Math.pow( 10, exponent );
	const hashAdditive = halfTolerance * hashMultiplier;
	for ( let i = 0; i < vertexCount; i ++ ) {

		const index = indices ? indices.getX( i ) : i;

		// Generate a hash for the vertex attributes at the current index 'i'
		let hash = '';
		for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

			const name = attributeNames[ j ];
			const attribute = geometry.getAttribute( name );
			const itemSize = attribute.itemSize;

			for ( let k = 0; k < itemSize; k ++ ) {

				// double tilde truncates the decimal value
				hash += `${ ~ ~ ( attribute[ getters[ k ] ]( index ) * hashMultiplier + hashAdditive ) },`;

			}

		}

		// Add another reference to the vertex if it's already
		// used by another index
		if ( hash in hashToIndex ) {

			newIndices.push( hashToIndex[ hash ] );

		} else {

			// copy data to the new index in the temporary attributes
			for ( let j = 0, l = attributeNames.length; j < l; j ++ ) {

				const name = attributeNames[ j ];
				const attribute = geometry.getAttribute( name );
				const morphAttr = geometry.morphAttributes[ name ];
				const itemSize = attribute.itemSize;
				const newarray = tmpAttributes[ name ];
				const newMorphArrays = tmpMorphAttributes[ name ];

				for ( let k = 0; k < itemSize; k ++ ) {

					const getterFunc = getters[ k ];
					const setterFunc = setters[ k ];
					newarray[ setterFunc ]( nextIndex, attribute[ getterFunc ]( index ) );

					if ( morphAttr ) {

						for ( let m = 0, ml = morphAttr.length; m < ml; m ++ ) {

							newMorphArrays[ m ][ setterFunc ]( nextIndex, morphAttr[ m ][ getterFunc ]( index ) );

						}

					}

				}

			}

			hashToIndex[ hash ] = nextIndex;
			newIndices.push( nextIndex );
			nextIndex ++;

		}

	}

	// generate result BufferGeometry
	const result = geometry.clone();
	for ( const name in geometry.attributes ) {

		const tmpAttribute = tmpAttributes[ name ];

		result.addAttribute( name, new THREE.BufferAttribute(
			tmpAttribute.array.slice( 0, nextIndex * tmpAttribute.itemSize ),
			tmpAttribute.itemSize,
			tmpAttribute.normalized,
		) );

		if ( ! ( name in tmpMorphAttributes ) ) continue;

		for ( let j = 0; j < tmpMorphAttributes[ name ].length; j ++ ) {

			const tmpMorphAttribute = tmpMorphAttributes[ name ][ j ];

			result.morphAttributes[ name ][ j ] = new THREE.BufferAttribute(
				tmpMorphAttribute.array.slice( 0, nextIndex * tmpMorphAttribute.itemSize ),
				tmpMorphAttribute.itemSize,
				tmpMorphAttribute.normalized,
			);

		}

	}

	// indices

	result.setIndex( newIndices );

	return result;

}

function extractCoordinates(data, type) {
    const result = [];
    const result_2 = [];
    let z_min = Infinity;
    let z_max = -Infinity;

    if (type === 'application/json') {
        // Process JSON data
        for (const obj of data) {
            const { x, y, z } = obj;
            if (x === undefined || y === undefined || z === undefined) {
                throw new Error("JSON data must contain 'x', 'y', and 'z'");
            }

            if (z < z_min) z_min = z;
            if (z > z_max) z_max = z;

            result.push(x, y);
            result_2.push([x, y, z]);
        }
    } else if (type === 'text/plain') {
        // Process plain text data
        const lines = data.split('\n');
        for (const line of lines) {
            if (line.trim() === '') continue;

            const values = line.split(' ');
            if (values.length < 3) {
                throw new Error("Plain text data must contain at least 3 values per line");
            }

            const x = parseFloat(values[0].trim());
            const y = parseFloat(values[1].trim());
            const z = parseFloat(values[2].trim());

            if (z < z_min) z_min = z;
            if (z > z_max) z_max = z;

            result.push(x, y);
            result_2.push([x, y, z]);
        }
    } else if (type === 'text/csv') {
        // Process CSV data
        const lines = data.split('\n');
        if (lines.length === 0 || !lines[0].includes(',')) {
			// window.electron.sendToMain('handle-error', 'error')
            throw new Error("CSV data must contain headers and use commas");
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const xIndex = headers.indexOf('x');
        const yIndex = headers.indexOf('y');
        const zIndex = headers.indexOf('z');

        if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
            window.electron.sendToMain('handle-error', 'error')
			throw new Error("CSV data must contain 'x', 'y', and 'z' columns");
        }

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            const values = line.split(',');
            const x = parseFloat(values[xIndex]);
            const y = parseFloat(values[yIndex]);
            const z = parseFloat(values[zIndex]);

            if (z < z_min) z_min = z;
            if (z > z_max) z_max = z;

            result.push(x, y);
            result_2.push([x, y, z]);
        }
    }

    return [result, result_2, z_min, z_max];
}
  

const colorscale = [['0', 'rgb(0,0,131)'], 
					['0.125', 'rgb(0,60,170)'], 
					['0.375', 'rgb(5,255,255)'], 
					['0.625', 'rgb(255,255,0)'], 
					['0.875', 'rgb(250,0,0)'], 
					['1', 'rgb(128,0,0)']]

function getColorMap(colors){
	let c = document.createElement("canvas");
	c.height = 1024; // Длина канвас
	c.width = 1; // Ширина канваса
	let ctx = c.getContext("2d");
	
	// Создание линейной градации  
	const gradient = ctx.createLinearGradient(0, 0, 0, 1024);

	// Добавление цвет в канвас 
	colors.forEach(c => {
	  gradient.addColorStop(c[0], c[1]);
	});

	
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 1, 1024);
	
	return new THREE.CanvasTexture(c);
}

let res = extractCoordinates(pointsData, dataType)
let newpoints = res[0]
let ss = res[1]
let z_min = res[2]
let z_max = res[3]

const d = new Delaunator(newpoints);


var points3d = [];
var container;
var mesh, mesh_grade;
var camera, scene, renderer;
var controls;

init();
animate();

window.init = init
function init() {

	container = document.getElementById( 'container');
	container.style = "width: 100%; height: 100%";


	camera = new THREE.PerspectiveCamera( 10, window.innerWidth / window.innerHeight, 1, 4000 );
	camera.position.setScalar(150);
	controls = new THREE.OrbitControls(camera, render.domElement)
	
	const gui = new GUI();

	// Lock OrbitControls when interacting with the GUI
	const lockOrbitControls = (state) => {
		controls.enabled = !state;
  	};

	var background = gui.addFolder('Найстройки цвета');
	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x050505, 2000, 3500 );
	
	
	// Default scene background color
	const sceneOptions = {
		backgroundColor: '#1a1a1a', // Default is black
		materialColor: '#ffba24',
		cloudColor: '#ffba24'
	};
  
	const pointsCloud = {
		enable: false,
		cloudsize: 1
	}

	const materialType = {
		default: false,
		gradient: true

	}

	console.log(sceneOptions.backgroundColor)
	scene.background = new THREE.Color(sceneOptions.backgroundColor)
	// Add a color controller to the GUI
	const colorController = background.addColor(sceneOptions, 'backgroundColor').name('Цвет фона');
	
	// When the color changes, update the scene's background color
	colorController.onChange((newColor) => {
		scene.background = new THREE.Color(newColor);
	});

	background.addColor(sceneOptions, 'materialColor').name('Цвет поверхности').onChange((newColor) => {
		mesh.material.color = new THREE.Color(newColor);
	});

	background.addColor(sceneOptions, 'cloudColor').name('Цвет точек').onChange((newColor) => {
		cloud.material.color = new THREE.Color(newColor);
	});
	

	const lightFolder = gui.addFolder('Освещение')

	var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5); // Color, Intensity
	directionalLight.position.set(1, 1, 1); // Position of the light
	scene.add(directionalLight);
	
	var ambientLight = new THREE.AmbientLight(0x000000); // Color
	scene.add(ambientLight);

	var intensityController = lightFolder.add(directionalLight, 'intensity').min(0).max(10).step(0.001).name('Интенсивность')
	intensityController.onChange((value) => {lockOrbitControls(true);});
	intensityController.onFinishChange(() => {lockOrbitControls(false);});

	var lightXController = lightFolder.add(directionalLight.position, 'x').min(- 100).max(100).step(0.001).name('Позиция (X)')
	lightXController.onChange((value) => {lockOrbitControls(true);});
	lightXController.onFinishChange(() => {lockOrbitControls(false);});

	var lightYController =  lightFolder.add(directionalLight.position, 'y').min(- 100).max(100).step(0.001).name('Позиция (Y)')
	lightYController.onChange((value) => {lockOrbitControls(true);});
	lightYController.onFinishChange(() => {lockOrbitControls(false);});

	var lightZController = lightFolder.add(directionalLight.position, 'z').min(- 100).max(100).step(0.001).name('Позиция (Z)')
	lightZController.onChange((value) => {lockOrbitControls(true);});
	lightZController.onFinishChange(() => {lockOrbitControls(false);});

	for (let i = 0; i < d.triangles.length; i += 3) {
		const p = ss[d.triangles[i]];
		const q = ss[d.triangles[i + 1]];
		const r = ss[d.triangles[i + 2]];
	  
		points3d.push(new THREE.Vector3(p[0], p[2], p[1]));
		points3d.push(new THREE.Vector3(q[0], q[2], q[1]));
		points3d.push(new THREE.Vector3(r[0], r[2], r[1]));
	  }
	  
	  
	  var geom = new THREE.BufferGeometry().setFromPoints(points3d);
	  geom.removeAttribute('normal');
	  geom = mergeVertices(geom)
	  geom.computeVertexNormals()
	  
	  
	  mesh = new THREE.Mesh(
		geom, // re-use the existing geometry
		new THREE.MeshPhongMaterial({ color: new THREE.Color(sceneOptions.materialColor), 
			  flatShading: false,
			  wireframe: false,
			  shininess: 0.8,
			  specular: 0x000101,
			  emissive: 0x040101,
			  flatShading: false,
			transparent: false,
		  side: THREE.DoubleSide})
	  );


	  mesh_grade = new THREE.Mesh(
		geom, // re-use the existing geometry
		new THREE.MeshPhongMaterial({
			  flatShading: false,
			  wireframe: false,
			  shininess: 0.8,
			  specular: 0x000101,
			  emissive: 0x040101,
			  flatShading: false,
			transparent: false,
		  side: THREE.DoubleSide, 
		  onBeforeCompile: shader => {
			shader.uniforms.hMax = {value: z_max};
			shader.uniforms.hMin = {value: z_min};
			shader.uniforms.colorMap = {value: getColorMap(colorscale)};
			shader.vertexShader = `
			  varying float h;
			  ${shader.vertexShader}
			`.replace(
			  `#include <begin_vertex>`,
			  `#include <begin_vertex>
				h = transformed.y;
			  `
			);
			//console.log(shader.vertexShader);
			shader.fragmentShader = `
			  uniform float hMax;
			  uniform float hMin;
			  uniform sampler2D colorMap;
			  
			  varying float h;
			  ${shader.fragmentShader}
			`.replace(
			  `#include <color_fragment>`,
			  `#include <color_fragment>
				float hRatio = 1. - (h - hMin) / (hMax - hMin);
				hRatio = clamp(hRatio, 0., 1.);
				diffuseColor.rgb = texture(colorMap, vec2(0.5, hRatio)).rgb;
			  `
			)}
	})
	  );
	  

	var cloud = new THREE.Points(
		geom,
		new THREE.PointsMaterial({size: pointsCloud.cloudsize, color: sceneOptions.materialColor})
	);
	  


	const boundingBox = new THREE.Box3().setFromObject(mesh);
	const center = new THREE.Vector3();
	boundingBox.getCenter(center)
	mesh.position.sub(center);
	mesh_grade.position.sub(center);
	cloud.position.sub(center);
	  
	scene.add(mesh_grade);
	const axesHelper = new THREE.AxesHelper( 200 );
	scene.add( axesHelper );
	axesHelper.setColors(new THREE.Color("red"), new THREE.Color("green"), new THREE.Color("blue"))
	  
	
	renderer = new THREE.WebGLRenderer( { antialias: false, alpha : true } );
	renderer.setClearColor(0x000000, 0);
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	container.appendChild( renderer.domElement );

	const othersFolder = gui.addFolder('Другие параметры')
	othersFolder.add(mesh.material, "wireframe").name('Треугольники').onChange((value) => {
		mesh_grade.material.wireframe = value;
	});
	othersFolder.add(mesh_grade.material, "visible").name('Поверхности').onChange((value) => {mesh.material.visible = value});
	othersFolder.add(axesHelper, "visible").name('Оси координат');
	
	othersFolder.add(pointsCloud, 'enable').name('Показать исходные точки').onChange((value) => {
		if (value) {
			scene.add(cloud)
		} else {
			scene.remove(cloud);
		}})


		othersFolder.add(pointsCloud, 'cloudsize').min(0).max(5).step(0.00001).name('Размер').onChange((value) => {cloud.material.size = value; lockOrbitControls(true)}).onFinishChange(() => {lockOrbitControls(false)});

	othersFolder.add({ setGradian: () => {


		if (mesh) {  // Assurez-vous que le cube existe
			materialType.default = false
			materialType.gradient = true
			scene.remove(mesh);  // Retirer le cube de la scène
			scene.add(mesh_grade)  // Supprimer la référence pour éviter les fuites de mémoire
		}
	} }, 'setGradian').name("Градиан");

	othersFolder.add({ setNormal: () => {
		
		if (mesh_grade) {  // Assurez-vous que le cube existe
			materialType.default = true
			materialType.gradient = false
			scene.remove(mesh_grade);  // Retirer le cube de la scène
			scene.add(mesh)  // Supprimer la référence pour éviter les fuites de mémoire
		}
	} }, 'setNormal').name("Нормал");
	
	window.addEventListener( 'resize', onWindowResize, false);
}



function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	render();
	requestAnimationFrame(animate);
}

function render() {
	renderer.render(scene, camera);
}

