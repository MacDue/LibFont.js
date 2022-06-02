#!/bin/bash
# Needlessly complex script to update GitHub pages
shopt -s extglob
read -p "Are you sure? This will delete uncommitted changes... " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    exit 1
fi
git branch -D demo
git checkout --orphan demo
cd glyph_table_window
npm i
npm run build
cd ..
cp -r glyph_table_window/build ./demo
mv ./demo/index.html ./demo/glyph_table.html
cp ./*.html demo
cp ./*.js demo
mkdir project_src
mv !(demo|project_src) ./project_src
mv demo/* .
rm -r ./demo
mkdir dist
cp static/js/main*.js dist/glyph-table.min.js
cp static/css/main*.css dist/glyph-table.min.css
git add !(project_src)
git commit -m "Publish demo"
git push -f --set-upstream origin demo
git checkout master
git branch -d demo
git reset
git checkout .
git clean -fd
rm -rf project_src/
