import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import * as CANNON from 'cannon-es'
import gsap from 'gsap'
import CircleProgress from 'js-circle-progress'
import CannonUtils from './cannonUtils'
import CannonDebugRenderer from './cannonDebugRenderer'
//circle progress bar
const cp = new CircleProgress({
  min: 0,
  max: 100,
  value: 0,
  textFormat: 'percent',
})
cp.style.top = '45%'
cp.style.left = '47%'
cp.style.position = 'absolute'
document.body.append(cp)

const text = document.createElement('p')
text.style.fontSize = '36px'
text.style.color = 'white'
text.style.fontFamily = 'Monospace'
text.append('Click to play')

const instructions = document.createElement('div')
instructions.style.width = '100%'
instructions.style.height = '100%'
instructions.style.display = 'flex'
instructions.style.flexDirection = 'column'
instructions.style.alignItems = 'center'
instructions.style.justifyContent = 'center'
instructions.style.textAlign = 'center'
instructions.style.cursor = 'pointer'
instructions.append(text)

const blocker = document.createElement('div')
blocker.style.position = 'absolute'
blocker.style.width = '100%'
blocker.style.height = '100%'
blocker.style.top = '0px'
blocker.style.left = '0px'
blocker.style.backgroundColor = 'rgba(0,0,0,0.5)';
blocker.append(instructions)

const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('./draco/')
const gltfLoader = new GLTFLoader();
gltfLoader.crossOrigin = true;
gltfLoader.setDRACOLoader(dracoLoader)
let walking = true;
let walk
let crash = false;
gltfLoader.load(
  'models/map.glb',
  (gltf) => {
    let clicked = true // navigate click event
    const scene = new THREE.Scene()
    // scene.fog = new THREE.Fog('#60a3e0', 1, 100)

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    camera.position.set(0, 7, -2)
    scene.add(camera)
    var bgTexture = new THREE.TextureLoader().load("background.jpg")
    // bgTexture.mapping = THREE.EquirectangularReflectionMapping
    // bgTexture.minFilter = THREE.LinearFilter;
    scene.background = bgTexture
    scene.environment = bgTexture
    var aLight = new THREE.AmbientLight(0xffffff)
    scene.add(aLight)
    const directionalLight = new THREE.DirectionalLight(0xffff00, 1);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2 * 2048;
    directionalLight.shadow.mapSize.height = 2 * 2048;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.bottom = -500;
    directionalLight.shadow.camera.left = -500;
    scene.add(directionalLight)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor('#60a3e0')
    renderer.useLegacyLights = true // this option is to load light embed on glb file.
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.VSMShadowMap // PCFShadowMap
    document.body.appendChild(renderer.domElement)

    const raycaster = new THREE.Raycaster()
    const world = new CANNON.World()
    // const cannonDebugRenderer = new CannonDebugRenderer(scene, world)
    world.gravity.set(0, -9.82, 0)
    const groundMaterial = new CANNON.Material('groundMaterial')
    const slipperyMaterial = new CANNON.Material('slipperyMaterial')
    const slippery_ground_cm = new CANNON.ContactMaterial(
      groundMaterial,
      slipperyMaterial,
      {
        friction: 0,
        restitution: 0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 3,
      }
    )
    world.addContactMaterial(slippery_ground_cm)
      ; (world.solver as CANNON.GSSolver).iterations = 10
    // Character Collider
    const characterCollider = new THREE.Object3D()
    const colliderShape = new CANNON.Sphere(0.5)
    const colliderBody = new CANNON.Body({ mass: 1, material: slipperyMaterial })

    let mixer: THREE.AnimationMixer
    let modelReady = false
    let modelMesh: THREE.Object3D
    let targetMesh: THREE.Object3D

    const animationActions: THREE.AnimationAction[] = []
    let activeAction: THREE.AnimationAction
    let lastAction: THREE.AnimationAction

    let mapModel = gltf.scene
    scene.add(mapModel)

    const video = document.createElement('video')
    video.src = 'video.mp4'
    video.crossOrigin = 'anonymous'
    video.loop = true
    // video.muted = false
    video.play()
    const videoTexture = new THREE.VideoTexture(video)
    videoTexture.minFilter = THREE.LinearFilter
    videoTexture.wrapS = THREE.MirroredRepeatWrapping
    videoTexture.wrapT = THREE.MirroredRepeatWrapping

    let videoMesh1 = mapModel.getObjectByName("poster1")
    videoMesh1.material.map = videoTexture;
    videoMesh1.material.side = THREE.FrontSide;
    videoMesh1.material.needsUpdate = true;
    let videoMesh2 = mapModel.getObjectByName("poster2")
    videoMesh2.material.map = videoTexture;
    videoMesh2.material.side = THREE.FrontSide;
    videoMesh2.material.needsUpdate = true;
    let videoMesh3 = mapModel.getObjectByName("poster3")
    videoMesh3.material.map = videoTexture;
    videoMesh3.material.side = THREE.FrontSide;
    videoMesh3.material.needsUpdate = true;
    let videoMesh4 = mapModel.getObjectByName("poster4")
    videoMesh4.material.map = videoTexture;
    videoMesh4.material.side = THREE.DoubleSide;
    videoMesh4.material.needsUpdate = true;
    let alink = scene.getObjectByName("alink")
    alink.material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    gltf.scene.traverse(function (child) {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if (child.name == 'Ground' || child.name == 'Rectangle009' || child.name == 'B_basis' || child.name == 'Rectangle010' || child.name == 'Rectangle015' || child.name == 'Rectangle001' || child.name == 'Rectangle025' || child.name == 'Rectangle019' || child.name == 'Rectangle032' || child.name == 'Rectangle029' || child.name == 'Rectangle026' || child.name == 'Rectangle027' || child.name == 'Rectangle008' || child.name == 'Rectangle003' || child.name == 'Rectangle012' || child.name == 'Rectangle011' || child.name == 'Rectangle019') {
        let cityMesh: THREE.Object3D
        const cityBody = new CANNON.Body({ mass: 0, material: groundMaterial })
        cityMesh = child
        const position = new THREE.Vector3()
        cityMesh.getWorldPosition(position)

        const cityShape = CannonUtils.CreateTrimesh(
          (cityMesh as THREE.Mesh).geometry
        )
        cityBody.position.x = position.x
        cityBody.position.y = position.y
        cityBody.position.z = position.z
        cityBody.addShape(cityShape)
        world.addBody(cityBody)
      }
    })
    gltfLoader.load(
      'models/chicken.glb',
      (gltf) => {
        gltf.scene.traverse(function (child) {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        })
        const avatar = gltf.scene

        avatar.children[0].scale.set(0.1, 0.1, 0.1)
        avatar.children[0].position.set(0, 1.72, 0)
        avatar.castShadow = true
        avatar.receiveShadow = true

        gltfLoader.load(
          'models/egg.glb',
          (gltf) => {
            gltf.scene.traverse(function (child) {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            })

            const egg = gltf.scene
            egg.children[0].scale.set(10, 10, 10)
            egg.children[0].position.set(0, 0.3, 18)
            scene.add(egg)

            const anotherEgg = egg.clone()
            anotherEgg.children[0].scale.set(10, 10, 10)
            anotherEgg.children[0].position.set(0, 0.3, 38)
            scene.add(anotherEgg)
          })

        const orbitControls = new OrbitControls(camera, renderer.domElement)
        const inputVelocity = new THREE.Vector3()
        const velocity = new CANNON.Vec3()
        orbitControls.enableDamping = true
        orbitControls.dampingFactor = 0.05
        orbitControls.minPolarAngle = Math.PI / 3
        orbitControls.maxPolarAngle = Math.PI / 3
        orbitControls.enableZoom = false
        orbitControls.enabled = false

        mixer = new THREE.AnimationMixer(gltf.scene)
        animationActions.push(mixer.clipAction(gltf.animations[2]))
        animationActions.push(mixer.clipAction(gltf.animations[1]))

        activeAction = animationActions[0]
        activeAction.loop = THREE.LoopRepeat
        activeAction.play()
        scene.add(avatar)
        modelMesh = gltf.scene
        modelMesh.add(camera)

        const creatCollider = () => {
          characterCollider.position.x = 0
          characterCollider.position.y = 3
          characterCollider.position.z = 0
          scene.add(characterCollider)
          // colliderBody.addShape(colliderShape, new CANNON.Vec3(0, 0.5, 0))
          colliderBody.addShape(colliderShape, new CANNON.Vec3(0, -0.5, 0))
          colliderBody.position.set(
            characterCollider.position.x,
            characterCollider.position.y,
            characterCollider.position.z
          )
          colliderBody.linearDamping = 0.95
          colliderBody.angularFactor.set(0, 1, 0) // prevents rotation X,Z axis
          world.addBody(colliderBody)

          gsap.to(camera.position, { x: 0, y: 5, z: -20, duration: 2 })
        }

        const setAction = (toAction: THREE.AnimationAction, loop: Boolean) => {
          if (toAction != activeAction) {
            lastAction = activeAction
            activeAction = toAction
            lastAction.fadeOut(0.1)
            activeAction.reset()
            activeAction.fadeIn(0.2)
            activeAction.play()
            if (!loop) {
              activeAction.clampWhenFinished = true
              activeAction.loop = THREE.LoopOnce
            }
          }
        }
        modelReady = true
        creatCollider()
        const mouse = new THREE.Vector2()

        renderer.domElement.addEventListener('mousedown', (event) => {
          event.preventDefault();
          if (!clicked) {
            // Set the mouse coordinates (normalized between -1 and 1)
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

            // Set the origin of the raycaster to the camera position
            raycaster.setFromCamera(mouse, camera)
            const intersects = raycaster.intersectObjects(scene.children)
            if (intersects.length > 0) {
              if (intersects[0].object.name == 'Ground' || intersects[0].object.name == 'Ground' || intersects[0].object.name == 'Rectangle009' || intersects[0].object.name == 'B_basis' || intersects[0].object.name == 'Rectangle010' || intersects[0].object.name == 'Rectangle015' || intersects[0].object.name == 'Rectangle001' || intersects[0].object.name == 'Rectangle025' || intersects[0].object.name == "Object_2") {
                //mouse pointer mesh
                crash = false;
                targetMesh = intersects[0]

                if (walk)
                  walk.kill()
                distance = colliderBody.position.distanceTo(targetMesh.point)

                walk = gsap.to(colliderBody.position, {
                  x: targetMesh.point.x,
                  // y: targetMesh.point.y,
                  z: targetMesh.point.z,
                  duration: distance / 2
                })
                walking = true;

                //mouse pointer mesh
                const ringGeometry = new THREE.RingGeometry(0.1, 0.2)
                // Define the material
                const material = new THREE.MeshBasicMaterial({ color: '#ff66cc', side: THREE.DoubleSide })
                // Create the mesh
                const ringMesh = new THREE.Mesh(ringGeometry, material)
                ringMesh.rotation.x = Math.PI / 2 //
                ringMesh.position.set(targetMesh.point.x, targetMesh.point.y, targetMesh.point.z)
                scene.add(ringMesh)
                gsap.to(ringMesh.scale, {
                  x: 0,
                  y: 0,
                  z: 0,
                  duration: 1,
                })
              }
              if (intersects[0].object.name === "") { }
            }
          }

        })

        window.addEventListener('resize', onWindowResize, false)

        function onWindowResize() {
          camera.aspect = window.innerWidth / window.innerHeight
          camera.updateProjectionMatrix()
          renderer.setSize(window.innerWidth, window.innerHeight)
          render()
        }

        const targetQuaternion = new THREE.Quaternion()
        const clock = new THREE.Clock()
        let delta = 0
        let distance = 0

        function animate() {
          requestAnimationFrame(animate)
          if (modelReady) {
            const p = characterCollider.position
            p.y -= 1
            modelMesh.position.y = characterCollider.position.y
            const rotationMatrix = new THREE.Matrix4()
            if (targetMesh)
              distance = colliderBody.position.distanceTo(targetMesh.point)
            if (distance > 1) {
              if (targetMesh && !crash) {
                rotationMatrix.lookAt(p, modelMesh.position, modelMesh.up)
                targetQuaternion.setFromRotationMatrix(rotationMatrix)
              }
            }
            if (!modelMesh.quaternion.equals(targetQuaternion)) {
              modelMesh.quaternion.rotateTowards(targetQuaternion, delta * 10)
            }
            modelMesh.position.lerp(characterCollider.position, 0.1)
          }
          if (distance >= 1) {
            setAction(animationActions[1], true)
            mixer.update(delta)
          }
          else {
            setAction(animationActions[0], true)
            mixer.update(delta)
          }
          delta = Math.min(clock.getDelta(), 0.1)
          world.step(delta)

          characterCollider.position.set(
            colliderBody.position.x,
            colliderBody.position.y,
            colliderBody.position.z
          )

          orbitControls.update()
          if (video) {
            videoTexture.needsUpdate = true
            video.play()
          }
          render()
        }

        function render() {
          if (!clicked)
            camera.lookAt(modelMesh.position.x, modelMesh.position.y, modelMesh.position.z)
          camera.updateProjectionMatrix()
          renderer.render(scene, camera)

        }
        colliderBody.addEventListener('collide', function (e: any) {
          crash = true;
          if (walk)
            walk.kill()
        })
        animate()
        instructions.addEventListener('click', function () {
          if (clicked == false) {
            clicked = true
            gsap.to(camera.position, {
              x: 0,
              y: 40,
              z: -50,
              duration: 4,
              onStart: () => {
                orbitControls.enabled = false
              },
              onUpdate: () => {
                orbitControls.enabled = false
              },
              onComplete: () => {
                orbitControls.enabled = true
                orbitControls.autoRotate = true
              },
            })

          } else {
            clicked = false
            instructions.style.display = 'none';
            blocker.style.display = 'none';
            gsap.to(camera.position, {
              x: 0,
              y: 7,
              z: -2,
              duration: 4,
              onStart: () => {
                orbitControls.enabled = false
              },
              onUpdate: () => {
                orbitControls.enabled = false
              },
              onComplete: () => {
                orbitControls.enabled = false
                orbitControls.autoRotate = false
              },
            })
          }

        })

      },
      (xhr) => {
        console.log('avatar_glb has been loaded')
      },
      (error) => {
        console.log(error)
      }
    )

  },
  (xhr) => {
    cp.value = (xhr.loaded) / (xhr.total) * 100
    if (cp.value == 100) {
      gsap.to(cp, {
        duration: 2,
        opacity: 0,
        onComplete: () => {
          cp.remove()
          document.body.append(blocker)
        }
      })
    }
  },
  (error) => {
    console.log(error)
  }
)