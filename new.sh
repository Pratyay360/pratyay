# #!/bin/env bash

# default_page_path="_default/page.smd"
# default_section_path="_default/section.smd"
# default_page_layout="page.shtml"
# default_section_layout="section.shtml"
# kind="page"
# date=$(date --rfc-3339="seconds" | sed "s/ /T/g")

# usage() {
# 	printf '%b\n' \
# 	"Usage: $0 [options]" \
# 	"Options:" \
# 	"\t-h Print this help message" \
# 	"\t-l Specify page layout." \
# 	"\t-p Specify page path." \
# 	"\t-t Specify page title." \
# 	"\t-T Specify page tags."
# }

# while getopts "hl:p:t:T:" opt; do
# 	case $opt in
# 		h) help=true ;;
# 		l) layout="${OPTARG}.shtml" ;;
# 		p) path="${OPTARG}" ;;
# 		t) title="${OPTARG}" ;;
# 		T) tags="${OPTARG}" ;;
# 		\?) echo "Invalid option: -${OPTARG}" >&2; exit 1 ;;
# 	esac
# done

# if [ "$help" ] || [ $# -eq 0 ]; then
# 	usage
# 	exit
# fi

# if [ -z "${path}" ]; then
# 	echo "Err: No path given"
# 	usage
# 	exit
# fi

# basename_no_ext=$(basename "${path}" | cut -d '.' -f 1)
# if [ "${basename_no_ext}" == "index" ]; then
# 	kind="section"
# fi

# # Set titles when flag is not passed and use parent dirname for sections.
# if [ -z "${title}" ] && [ "${kind}" == "section" ]; then
# 	title=$(
# 		basename "$(dirname ${path})" |
# 		sed "s/-/ /g" |
# 		awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1'
# 	)
# elif [ -z "${title}" ] && [ "${kind}" == "page" ]; then
# 	title=$(
# 		basename -s .smd "${path}" |
# 		sed "s/-/ /g" |
# 		awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1'
# 	)
# fi

# new_dir_path=$(dirname "${path}")
# if [ ! -d "${new_dir_path}" ]; then
# 	mkdir -p "${new_dir_path}"
# 	echo "Parent directory generated: ${new_dir_path}"

# 	check_dir=${path}
# 	while true; do
# 		check_dir="$(dirname "${check_dir}")"

# 		if [ "${check_dir}" == "content" ]; then
# 			break
# 		fi

# 		auto_section_page_path="${check_dir}/index.smd"
# 		if [ ! -f "${auto_section_page_path}" ] && [ "${kind}" == "page" ]; then
# 			cp "${default_section_path}" "${auto_section_page_path}"
# 			echo "Parent section generated: ${auto_section_page_path}"

# 			section_title=$(
# 			basename "${check_dir}" |
# 			sed "s/-/ /g" |
# 			awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1'
# 			)

# 			sed -i -e "s/TITLE/${section_title}/g" "${auto_section_page_path}"
# 			sed -i -e "s/DATE/${date}/g" "${auto_section_page_path}"
# 			sed -i -e "s/LAYOUT/${default_section_layout}/g" "${auto_section_page_path}"
# 		fi
# 	done
# fi

# if [ "${kind}" == "page" ]; then
# 	cp "${default_page_path}" "${path}"
# 	echo "Page generated: ${path}"
# elif [ "${kind}" == "section" ]; then
# 	cp "${default_section_path}" "${path}"
# 	echo "Section generated: ${path}"
# fi

# if [ -z "${layout}" ] && [ "${kind}" == "page" ]; then
# 	layout="${default_page_layout}"
# elif [ -z "${layout}" ] && [ "${kind}" == "section" ]; then
# 	layout="${default_section_layout}"
# fi

# sed -i -e "s/TITLE/${title}/g" "${path}"
# sed -i -e "s/DATE/${date}/g" "${path}"
# sed -i -e "s/LAYOUT/${layout}/g" "${path}"

# if [ -n "${tags}" ]; then
# 	IFS=" " read -ra splitTags <<<"${tags}"
# 	printf -v delimitedTags "\"%s\", " "${splitTags[@]}"
# 	sed -i -e "s/TAGS/ ${delimitedTags}/g" "${path}"
# else
# 	sed -i -e "s/TAGS//g" "${path}"
# fi
