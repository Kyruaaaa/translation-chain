# Petal rules

The scanned rock is peeled open and laid flat, like an orange peel. This is done with the **Peel Flower** add-on in Blender. The rock stops being a volume and becomes a surface.

## What goes in

- A hollow shell: the scan, with its open bottom.
- A closed mesh won't work. The cuts start from the open edge.

## Getting the shell ready

1. Keep only the largest piece of the scan.
2. Turn it so the opening faces down and the top faces up.
3. Reduce it to 30,000 faces.
4. Measure the surface: where the cracks are, and where the colour changes.

## Making the flower

1. **Centre:** choose a point near the middle of the top, picked at random from the 40 closest points.
2. **Core:** keep a solid centre around that point. It stays uncut.
3. **Cuts:** cut from the open edge toward the centre, stopping at the core. Cuts are spaced around the rim, a little unevenly.
4. **Follow the rock:** each cut follows the cracks and colour edges. The rock decides the line, the same way the water does in the choreography.
5. **Unwrap:** flatten the core and each petal, with as little stretching as possible.
6. **Attach:** turn each petal so it lines up with the core again.
7. **Open:** push each petal outward from the core. The push starts gently at the neck.
8. **Clean up:** leave out stray chips that aren't attached to the core, and drop stretched spike triangles.

## Settings

Sizes are relative to the size of the model.

| Setting | Default | What it does |
|---|---|---|
| Petals | 7 | Number of cuts |
| Core size | 0.23 | Size of the solid centre |
| Spread | 0.18 | How far the petals open |
| Neck length | 0.2 | How gradually a petal opens from the core |
| Follow surface | 4 | How strongly cuts follow cracks and colour (0 is straight) |
| Angle randomness | 0.3 | How uneven the spacing of the cuts is |
| Spread randomness | 0.4 | How unevenly the petals open |
| Center randomness | 40 | How many points the centre is picked from |
| Detail | 30,000 | Faces in the reduced model |

## Choosing

1. **Explore:** make 12 flowers. Each one also gets slightly different settings.
2. **Choose:** click the one that works. **More Like This** makes a new batch of close variations around it.
3. **Keep:** press **Keep This One**. The other flowers are deleted.

Every flower records its settings and seed, so it can be made again.

## Output

A square PNG seen from straight above:

| Part | Rule |
|---|---|
| Size | 4096 × 4096 px |
| Margin | 4 % |
| Colour | The texture exactly as scanned, with no shading |

The PNG goes to Final.
