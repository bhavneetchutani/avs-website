#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
npx --yes @gltf-transform/cli@4.2.1 meshopt models/avs-freight.raw.glb models/avs-freight.glb --level high
node assets/model-source/verify-model.mjs
