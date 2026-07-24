import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/constant/faq";

export default function FAQSection() {
	return (
		<section className="h-[50vh] flex flex-col justify-center items-center gap-16">
			<div>
				<h2 className="text-3xl md:text-5xl font-semibold text-center">
					Frequently asked questions
				</h2>
			</div>
			<Accordion className="w-full max-w-3xl space-y-4" multiple>
				{FAQ_ITEMS.map((item) => (
					<AccordionItem
						key={item.value}
						value={item.value}
						className={
							"w-full rounded-xl border-0 bg-secondary transition-colors hover:bg-foreground/10"
						}
					>
						<AccordionTrigger
							className={
								"items-center rounded-lg px-4 font-medium text-lg **:data-[slot=accordion-indicator]:size-5"
							}
						>
							{item.trigger}
						</AccordionTrigger>
						<AccordionPanel className={"text-base p-4 font-normal"}>
							{item.content}
						</AccordionPanel>
					</AccordionItem>
				))}
			</Accordion>
		</section>
	);
}
